<img src="public/nanobook.png" width="300">

# nanobook

a self-hostable guestbook!

## prerequisites

- nothing!
- bun (for development and building, tested on bun 1.3.11)

## installation

## configuration

the configuration file should be located at `config.yaml`.

### properties

see `config.example.yaml`

### development

```
# clone git repository
git clone https://github.com/yaaaarn/nanobook

# install dependencies
bun install
```

#### live server

this will open the server at http://localhost:3000.

```
bun run dev
```

#### building

running this will compile the entire source into a single-file executables for `darwin`,  `linux` (glibc + musl), and `windows` for both `x64` and `arm64` architectures.

```
bun run build
```

## license

MIT
