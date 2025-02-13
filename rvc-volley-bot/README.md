# TUTORIAL DE CONFIGURAÇÃO DO BOT

## Configurar em um novo ambiente

Siga os passos abaixo caso você vá configurar o BOT em uma maqina que não foi configurado anteriormente.

1 - Instalar o bun

`curl -fsSL https://bun.sh/install | bash` (Veja mais em https://bun.sh/)

2 - Após colocar os arquivos do bot na máquina (recomendo que use o git+github para isso), vá até a pasta com o BOT e digite:

`bun install` 
`bun pm trust --all`

Configurado!

## Abrir a sala

Se estiver em uma vps, utilize:

`screen -R`

Esse commando permite que você volte ao lugar em que parou quando conectar na VPS novamente.

Para abrir a sala em modo de teste, use:

`bun dev (TOKEN DO HAXBALL)`

Para abrir a sala em modo produção (deixar 24h), use:

`bun prod (TOKEN DO HAXBALL)`