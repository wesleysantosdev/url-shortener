# Deploy do shrten.pro na Oracle Cloud

Este documento descreve a infraestrutura de produção do `shrten.pro`, as
proteções aplicadas à VPS e os procedimentos de deploy, backup e manutenção.
Ele não contém credenciais reais.

## Arquitetura

```text
Internet
   |
   | TCP 80/443
   v
Caddy + frontend estático
   |
   | rede Docker privada
   +----> API Node.js :5000
              |----> PostgreSQL :5432
              +----> Redis :6379
```

Apenas o Caddy publica as portas `80` e `443`. API, PostgreSQL e Redis não
publicam portas no host e só se comunicam pela rede Docker interna.

## VPS e domínio

- Provedor: Oracle Cloud Free Tier.
- Instância: `oracle-vm`.
- Sistema: Ubuntu 24.04 ARM64.
- Recursos: 2 OCPU, 12 GB de RAM e boot volume de 50 GB.
- IP público: `147.15.69.77`.
- Domínio principal: `shrten.pro`.
- DNS: registros A de `@` e `www` apontando para `147.15.69.77`.
- Hostname: `oracle-vm`.
- Fuso horário: `America/Sao_Paulo`.

Na Security List da Oracle, as únicas entradas públicas necessárias são:

| Porta | Protocolo | Origem | Finalidade |
| --- | --- | --- | --- |
| 22 | TCP | IP administrativo ou `0.0.0.0/0` | SSH |
| 80 | TCP | `0.0.0.0/0` | HTTP e validação de certificado |
| 443 | TCP | `0.0.0.0/0` | HTTPS |

As portas `5000`, `5432` e `6379` não devem ser liberadas na Oracle nem no
UFW.

## Acesso SSH

O comando local de acesso é:

```bash
ssh oracle-vm
```

`oracle-vm` é apenas um alias definido em `~/.ssh/config`. Ele aponta para o IP,
usuário e arquivo de chave corretos; o alias, por si só, não adiciona segurança.

A autenticação é feita pelo par Ed25519:

- chave privada local: `~/.ssh/id_ed25519_oracle_vm`, permissão `600`;
- chave pública local: `~/.ssh/id_ed25519_oracle_vm.pub`;
- chave pública autorizada na VPS: `~/.ssh/authorized_keys`.

A chave privada nunca deve ser enviada ao Git, VPS, e-mail ou mensageiros.
Qualquer computador que possua uma cópia dessa chave privada poderá tentar se
autenticar como `ubuntu`.

Proteções configuradas no servidor:

- login por senha e keyboard-interactive desativados;
- login direto como `root` desativado;
- autenticação por chave pública habilitada;
- máximo de três tentativas de autenticação por conexão;
- UFW ativo e limitando tentativas na porta 22;
- fail2ban monitorando o SSH;
- atualizações automáticas de segurança habilitadas;
- duas chaves em `authorized_keys`: uma pessoal e outra exclusiva do CI/CD.

Portanto, qualquer pessoa pode alcançar o serviço SSH enquanto a porta 22
estiver pública, mas não consegue entrar apenas conhecendo o IP ou o alias. Ela
precisaria da chave privada, de outra chave previamente autorizada ou explorar
alguma vulnerabilidade. Se o IP administrativo for fixo, a regra da porta 22 na
Oracle pode ser limitada para `SEU_IP/32`, com cuidado para não perder o acesso.

## Organização dos arquivos

Os arquivos de produção ficam na raiz porque coordenam o sistema inteiro, e não
somente o backend:

| Arquivo | Responsabilidade |
| --- | --- |
| `docker-compose.production.yml` | Frontend, API, PostgreSQL, Redis, redes e volumes |
| `.env.production.example` | Nomes e exemplos das configurações de produção |
| `frontend/Dockerfile` | Build Vite e imagem final do Caddy |
| `frontend/Caddyfile` | HTTPS, frontend, proxy da API e redirects curtos |
| `ops/backup-postgres.sh` | Criação e retenção dos dumps do PostgreSQL |
| `ops/deploy.sh` | Validação e atualização segura dos containers |
| `ops/shrten-backup.service` | Execução do backup pelo systemd |
| `ops/shrten-backup.timer` | Agendamento diário do backup |
| `.github/workflows/ci-cd.yml` | Testes e deploy automático da `main` |

`ops` significa *operations*. A pasta contém automações de operação da aplicação
completa, como backup e integração com o sistema operacional. Colocá-la dentro
de `backend/` faria essas responsabilidades parecerem exclusivas da API.

Na VPS, o projeto está em `/opt/apps/shrten` e seus backups em
`/opt/backups/shrten`.

## Variáveis e segredos

O arquivo real é `/opt/apps/shrten/.env.production`. Ele foi gerado diretamente
na VPS, pertence ao usuário `ubuntu` e tem permissão `600`.

Segredos gerados separadamente:

- senha do PostgreSQL;
- senha do Redis;
- segredo de hash usado pelo rate limit;
- segredo estável usado para gerar os códigos curtos.

O `SHORT_CODE_SECRET` deve permanecer estável: trocá-lo pode alterar a relação
entre IDs e códigos curtos.

O Git ignora `.env`, `.env.*` e, portanto, `.env.production`. As exceções
versionadas são somente arquivos de exemplo:

- `.env.production.example`;
- `backend/.env.example`;
- `frontend/.env.example`.

Esses exemplos devem conter apenas placeholders. A chave SSH privada também
fica fora do repositório, em `~/.ssh`.

Para conferir uma regra sem mostrar o conteúdo do arquivo:

```bash
git check-ignore -v .env.production
```

Não execute `docker compose config` sem `--quiet` na VPS: a saída expandida
inclui os valores de ambiente. Para validar somente a configuração, use:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

## Caddy e HTTPS

O Caddy é a única entrada HTTP da VPS. Ele:

- obtém e renova automaticamente certificados TLS;
- redireciona HTTP para HTTPS;
- redireciona `www.shrten.pro` para `shrten.pro`;
- serve o build estático do frontend;
- encaminha `/api/*` para a API;
- encaminha caminhos Base62 de 4 a 6 caracteres para o redirect da API;
- comprime respostas e adiciona cabeçalhos de segurança.

Os certificados e dados internos do Caddy persistem nos volumes
`caddy-data` e `caddy-config`.

## Containers

Para verificar o estado:

```bash
ssh oracle-vm
cd /opt/apps/shrten
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Para acompanhar logs sem imprimir a configuração de ambiente:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 api web
```

Para reiniciar um serviço específico:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml restart api
```

## DBeaver por túnel SSH

O PostgreSQL é publicado somente no loopback da VPS:

```text
127.0.0.1:15432 -> container PostgreSQL:5432
```

A porta `15432` não deve ser aberta na Security List da Oracle nem no UFW. No
DBeaver, crie uma conexão PostgreSQL com:

**Main**

- Host: `127.0.0.1`;
- Port: `15432`;
- Database: `shrten`;
- Username: `shrten`;
- Password: valor atual de `POSTGRES_PASSWORD`.

**SSH**

- Host: `147.15.69.77`;
- Port: `22`;
- User: `ubuntu`;
- Authentication: `Public Key`;
- Private key: `~/.ssh/id_ed25519_oracle_vm`.

Consulte a senha somente no seu terminal:

```bash
ssh oracle-vm "grep '^POSTGRES_PASSWORD=' /opt/apps/shrten/.env.production"
```

Não salve essa senha no repositório ou em capturas de tela.

## CI/CD com GitHub Actions

O workflow `.github/workflows/ci-cd.yml` valida pull requests para `main` e
executa o deploy somente em `push` ou execução manual na própria `main`.

O job de validação executa:

- instalação reproduzível com `npm ci`;
- testes, typecheck e build do backend;
- lint, typecheck, testes e build do frontend.

Depois da validação, o job de produção:

1. conecta com uma chave SSH exclusiva;
2. cria um backup do PostgreSQL;
3. sincroniza exatamente o commit aprovado sem copiar `.env`;
4. constrói as imagens ARM64 na VPS;
5. aplica migrações e aguarda os health checks;
6. registra o SHA em `/opt/apps/shrten/REVISION`;
7. valida publicamente `https://shrten.pro`.

A chave exclusiva está em
`~/.ssh/id_ed25519_oracle_vm_github_actions`, fora do repositório. Sua chave
pública já está autorizada na VPS.

Crie no GitHub, em **Settings > Secrets and variables > Actions**, estes
Repository Secrets:

| Secret | Valor |
| --- | --- |
| `VPS_HOST` | `147.15.69.77` |
| `VPS_USER` | `ubuntu` |
| `VPS_SSH_PRIVATE_KEY` | conteúdo da chave privada exclusiva do Actions |
| `VPS_KNOWN_HOSTS` | chave pública de host SSH verificada da VPS |

Copie a chave privada para o secret sem imprimi-la em logs compartilhados:

```bash
cat ~/.ssh/id_ed25519_oracle_vm_github_actions
```

Gere o valor de host conhecido:

```bash
ssh-keyscan -H -t ed25519 147.15.69.77
```

Crie também o environment `production` em **Settings > Environments** e limite
suas deployment branches à `main`. Se o plano do GitHub oferecer required
reviewers para o repositório, uma aprovação manual pode ser exigida antes do
deploy.

O primeiro deploy automático só deve ocorrer depois de todas as mudanças serem
commitadas em `development`, validadas por pull request e mescladas em `main`.
Nunca faça deploy da `main` atual antes desse merge, pois ela ainda contém apenas
o commit inicial.

## Atualização manual de emergência

Na máquina de desenvolvimento, envie os arquivos sem copiar credenciais ou
artefatos locais:

```bash
rsync -az \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=coverage \
  --exclude=.env \
  --exclude='.env.*' \
  --exclude='*.log' \
  ./ oracle-vm:/opt/apps/shrten/
```

O padrão `.env.*` também exclui arquivos de exemplo durante atualizações. Eles
já existem na VPS e não são necessários para executar a aplicação.

Depois, reconstrua e aplique a nova versão:

```bash
ssh oracle-vm
cd /opt/apps/shrten
./ops/backup-postgres.sh
./ops/deploy.sh
```

O container da API executa `prisma migrate deploy` antes de iniciar o servidor.
Volumes de PostgreSQL, Redis e Caddy não são removidos por esse procedimento.

## Backup e restauração

O timer `shrten-backup.timer` executa um dump PostgreSQL diário por volta de
03:15, com atraso aleatório de até 15 minutos. Dumps com mais de 14 dias são
removidos por padrão.

Verificar o timer:

```bash
systemctl list-timers shrten-backup.timer
```

Executar e conferir um backup manual:

```bash
sudo systemctl start shrten-backup.service
sudo systemctl status shrten-backup.service --no-pager
find /opt/backups/shrten -maxdepth 1 -type f -name 'shrten-*.dump' -ls
```

Os dumps estão no mesmo disco da VPS. Isso protege contra erro lógico, mas não
contra perda total do boot volume ou da conta Oracle. Backups importantes também
devem ser copiados periodicamente para outro provedor ou máquina.

Uma restauração substitui dados e deve ser feita somente durante manutenção,
depois de criar outro backup. Exemplo:

```bash
cd /opt/apps/shrten
docker compose --env-file .env.production -f docker-compose.production.yml exec -T database \
  pg_restore --clean --if-exists --no-owner --username=shrten --dbname=shrten \
  < /opt/backups/shrten/ARQUIVO.dump
```

## Segundo projeto na mesma VPS

A VM comporta outro projeto desde que CPU, RAM e disco sejam monitorados. Cada
projeto deve ter sua própria pasta, Compose, rede privada, banco e volumes, por
exemplo `/opt/apps/outro-projeto`.

Somente um processo pode ocupar as portas 80 e 443. Um segundo projeto não deve
iniciar outro Caddy nessas portas. Quando ele for adicionado, o Caddy atual deve
ser promovido a proxy compartilhado em `/opt/apps/proxy`, com um domínio por
site e uma rede Docker externa compartilhada. Os bancos, caches e APIs de cada
projeto continuam privados.

## Validações realizadas

- backend: 128 testes, typecheck e build aprovados;
- frontend: lint, typecheck, 42 testes e build aprovados;
- imagens de produção construídas em ARM64 na VPS;
- PostgreSQL, Redis e API saudáveis;
- migrações Prisma aplicadas;
- HTTPS válido em `shrten.pro`;
- HTTP redirecionando para HTTPS;
- `www` redirecionando para o domínio principal;
- proxy da API respondendo com validação e rate limit;
- primeiro dump PostgreSQL criado;
- timer diário de backup habilitado.
