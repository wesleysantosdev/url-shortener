# Passo a passo: medir performance com e sem Redis e fila

Este roteiro produz uma comparação reproduzível entre:

- **baseline:** PostgreSQL em cada leitura e clique incrementado antes do
  redirecionamento;
- **otimizado:** URL lida do Redis e clique enviado à fila sem bloquear o
  usuário.

O objetivo é enxergar ganho de throughput e latência, observar o custo
transferido para a fila e evitar conclusões enganosas.

## 1. Antes de começar

Você precisa apenas de Docker com Compose. Todos os comandos devem ser
executados na raiz do projeto.

Confira:

```bash
docker version
docker compose version
```

O roteiro usa containers para API, worker e benchmark. Assim, a mesma versão
de Node e as mesmas dependências são usadas nos dois cenários.

## 2. Suba a arquitetura completa

```bash
docker compose --profile app up -d --build
```

Na primeira execução, o Docker precisa baixar imagens e instalar dependências.
As próximas usam cache de layers.

Confirme todos os estados:

```bash
docker compose --profile app ps -a
```

Procure por:

- `shortener-db`: `healthy`;
- `redis`: `healthy`;
- `migrate`: `Exited (0)`;
- `api`: `healthy`;
- `worker`: `Up`.

Se algo estiver errado:

```bash
docker compose --profile app logs migrate
docker compose --profile app logs api
docker compose --profile app logs worker
```

## 3. Crie a URL usada no experimento

```bash
curl -X POST http://localhost:5000/api/v1/shortener \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/performance-lab"}'
```

A resposta contém algo semelhante a:

```json
{
  "data": {
    "shortCode": "0123456789abcdef"
  }
}
```

Copie o valor real. Neste guia, `SEU_SHORT_CODE` sempre significa “substitua
pelo código retornado”, sem os sinais `<` e `>`.

Se receber `409`, essa URL determinística já foi criada em uma execução
anterior. Use outro sufixo, por exemplo `performance-lab-2`, ou reutilize o
código que você já guardou.

Valide o contrato antes de medir:

```bash
curl -i http://localhost:5000/SEU_SHORT_CODE
```

Você deve ver:

```text
HTTP/1.1 302 Found
Cache-Control: no-store
Location: https://example.com/performance-lab
```

Se não houver `302`, não faça o benchmark ainda.

## 4. Construa uma vez a ferramenta de benchmark

```bash
docker compose --profile benchmark build benchmark
```

Crie uma pasta para guardar resultados:

```bash
mkdir -p benchmark-results
```

Guardar a saída evita depender da memória ao comparar números.

## 5. Checklist de comparação justa

Nos dois cenários mantenha exatamente iguais:

- `SEU_SHORT_CODE`;
- número de conexões;
- duração;
- computador e containers;
- outras aplicações pesadas fechadas;
- URL já criada;
- uma pequena execução de aquecimento antes da medição oficial.

Use inicialmente:

```text
BENCHMARK_CONNECTIONS=50
BENCHMARK_DURATION_SECONDS=30
```

Trinta segundos reduz o peso de variações de inicialização. Depois você pode
testar 10, 100 ou 200 conexões.

## 6. Cenário A — sem cache e sem fila

Pare o worker para ele não disputar CPU ou banco durante o baseline:

```bash
docker compose --profile app stop worker
```

Recrie somente a API com as otimizações desligadas:

```bash
CACHE_ENABLED=false CLICK_TRACKING_MODE=sync \
docker compose --profile app up -d --no-deps --force-recreate api
```

Confirme que não medirá o modo errado:

```bash
docker compose exec api printenv CACHE_ENABLED CLICK_TRACKING_MODE
```

Resultado esperado:

```text
false
sync
```

Nesse modo, cada requisição faz:

```text
GET PostgreSQL → UPDATE PostgreSQL → 302
```

### 6.1 Aquecimento do baseline

Rode uma carga curta que não será anotada:

```bash
docker compose --profile benchmark run --rm \
  -e BENCHMARK_TARGET_URL=http://api:5000/SEU_SHORT_CODE \
  -e BENCHMARK_CONNECTIONS=50 \
  -e BENCHMARK_DURATION_SECONDS=5 \
  benchmark
```

Ela aquece conexão, processo Node, JIT e páginas do banco. Não aquece cache da
aplicação porque ele está desligado.

### 6.2 Medição oficial do baseline

```bash
docker compose --profile benchmark run --rm \
  -e BENCHMARK_TARGET_URL=http://api:5000/SEU_SHORT_CODE \
  -e BENCHMARK_CONNECTIONS=50 \
  -e BENCHMARK_DURATION_SECONDS=30 \
  benchmark | tee benchmark-results/baseline.txt
```

Anote:

- `Latency Avg`;
- latência em `97.5%` e `99%`;
- `Req/Sec Avg`;
- total de requests;
- timeouts ou erros de conexão.

## 7. Cenário B — Redis e fila assíncrona

Recrie a API com o comportamento otimizado:

```bash
CACHE_ENABLED=true CLICK_TRACKING_MODE=async \
docker compose --profile app up -d --no-deps --force-recreate api
```

Inicie o worker novamente:

```bash
docker compose --profile app start worker
```

Confirme as variáveis:

```bash
docker compose exec api printenv CACHE_ENABLED CLICK_TRACKING_MODE
```

Resultado esperado:

```text
true
async
```

Nesse modo, o caminho crítico é:

```text
GET Redis → dispara RPUSH → 302
```

O worker atualiza PostgreSQL depois.

### 7.1 Veja cache frio e quente

Remova somente a chave de teste:

```bash
docker compose exec redis redis-cli DEL url-cache:SEU_SHORT_CODE
```

Primeiro clique, cache frio:

```bash
curl -s -o /dev/null -w 'cold: %{time_total}s\n' \
  http://localhost:5000/SEU_SHORT_CODE
```

Segundo clique, cache quente:

```bash
curl -s -o /dev/null -w 'warm: %{time_total}s\n' \
  http://localhost:5000/SEU_SHORT_CODE
```

Um único `curl` é ruidoso e não prova ganho. Ele serve para visualizar o
conceito. O Autocannon fornecerá milhares de amostras.

Confirme o valor e TTL:

```bash
docker compose exec redis redis-cli GET url-cache:SEU_SHORT_CODE
docker compose exec redis redis-cli TTL url-cache:SEU_SHORT_CODE
```

O TTL deve estar próximo de `86400` logo após o preenchimento.

### 7.2 Aquecimento otimizado

```bash
docker compose --profile benchmark run --rm \
  -e BENCHMARK_TARGET_URL=http://api:5000/SEU_SHORT_CODE \
  -e BENCHMARK_CONNECTIONS=50 \
  -e BENCHMARK_DURATION_SECONDS=5 \
  benchmark
```

### 7.3 Observe a fila antes da medição

```bash
docker compose exec redis redis-cli LLEN click-events
```

O aquecimento pode ter criado backlog. Isso é esperado: o benchmark consegue
publicar mais rápido que o worker inicial drena 500 itens a cada 5 segundos.

### 7.4 Medição oficial otimizada

```bash
docker compose --profile benchmark run --rm \
  -e BENCHMARK_TARGET_URL=http://api:5000/SEU_SHORT_CODE \
  -e BENCHMARK_CONNECTIONS=50 \
  -e BENCHMARK_DURATION_SECONDS=30 \
  benchmark | tee benchmark-results/optimized.txt
```

Imediatamente depois:

```bash
docker compose exec redis redis-cli LLEN click-events
docker compose --profile app logs --tail=20 worker
```

Isso mostra uma consequência importante: removemos escrita do caminho do
usuário, mas o trabalho não desapareceu. Ele virou backlog assíncrono.

## 8. Como ler a tabela do Autocannon

### `Req/Sec Avg`

Throughput médio: quantas respostas o sistema entregou por segundo.

Se baseline fez 700 e otimizado 5.600:

```text
ganho = 5600 / 700 = 8 vezes
```

### `Latency Avg`

Tempo médio por request. É fácil de entender, mas pode esconder uma minoria
muito lenta.

### `p97.5` e `p99`

`p99 = 20 ms` significa que 99% terminaram em até 20 ms e 1% demorou mais.
Percentis representam melhor a experiência de cauda que somente a média.

### Redução percentual de latência

Se baseline foi 25 ms e otimizado 3 ms:

```text
redução = (25 - 3) / 25 × 100 = 88%
```

### “non 2xx responses”

O Autocannon contará todos os `302` como non-2xx. Neste endpoint isso é
correto, não uma falha. Antes do teste já confirmamos `302` e `Location` com
`curl`.

Falhas reais para investigar:

- `connection errors`;
- `timeouts`;
- respostas `404` ou `500` verificadas manualmente;
- API reiniciando;
- logs de erro no Redis ou PostgreSQL.

## 9. Onde olhar durante o teste

### CPU e memória de cada container

```bash
docker stats
```

Observe `api`, `worker`, `redis` e `shortener-db`. Pressione `Ctrl+C` para
sair. Se API chega a 100% de um core, ela pode ser o limite. Se PostgreSQL
satura no baseline, isso confirma o custo das consultas e updates síncronos.

### Cache hits e misses do Redis

```bash
docker compose exec redis redis-cli INFO stats
```

Procure por:

```text
keyspace_hits
keyspace_misses
```

São contadores globais da instância, portanto compare valores antes e depois,
não apenas o total absoluto.

### Tamanho e memória da fila

```bash
docker compose exec redis redis-cli LLEN click-events
docker compose exec redis redis-cli MEMORY USAGE click-events
```

Se `LLEN` cresce continuamente após a carga terminar, a capacidade do worker
está abaixo da taxa necessária.

### Clique consolidado no PostgreSQL

```bash
docker compose exec shortener-db psql -U admin -d shortener_db \
  -c "SELECT \"shortCode\", clicks FROM \"Url\" WHERE \"shortCode\" = 'SEU_SHORT_CODE';"
```

No modo assíncrono o valor pode estar atrasado. Aguarde batches e execute de
novo. Isso demonstra consistência eventual.

### Logs agregados do worker

```bash
docker compose --profile app logs -f worker
```

Cada batch informa:

- eventos retirados;
- URLs distintas;
- duração do processamento.

Não há log por clique, pois isso distorceria o benchmark.

## 10. Rode três vezes

Uma única execução pode coincidir com atividade do sistema operacional,
coleta de lixo ou manutenção do banco.

Para cada cenário:

1. faça um aquecimento curto;
2. rode a medição três vezes;
3. guarde os três arquivos;
4. use a mediana, não necessariamente o melhor número;
5. compare percentis e erros, não apenas req/s.

Exemplo de nomes:

```text
baseline-1.txt
baseline-2.txt
baseline-3.txt
optimized-1.txt
optimized-2.txt
optimized-3.txt
```

## 11. Isole cache e fila separadamente

Baseline versus otimizado muda duas coisas de uma vez. Para descobrir quanto
cada uma contribui, teste a matriz:

| Experimento | `CACHE_ENABLED` | `CLICK_TRACKING_MODE` | Worker |
|---|---|---|---|
| Baseline | `false` | `sync` | parado |
| Somente cache | `true` | `sync` | parado |
| Somente fila | `false` | `async` | ligado |
| Cache + fila | `true` | `async` | ligado |

Recrie a API com a combinação desejada:

```bash
CACHE_ENABLED=true CLICK_TRACKING_MODE=sync \
docker compose --profile app up -d --no-deps --force-recreate api
```

ou:

```bash
CACHE_ENABLED=false CLICK_TRACKING_MODE=async \
docker compose --profile app up -d --no-deps --force-recreate api
```

Interpretação:

- baseline → somente cache: ganho de evitar o `SELECT` PostgreSQL;
- baseline → somente fila: ganho de tirar o `UPDATE` do caminho crítico;
- resultados intermediários → completo: efeito combinado.

## 12. Teste cache frio separadamente

O benchmark principal usa uma URL quente para mostrar o melhor caso de um
link popular. Para medir cache frio:

1. apague `url-cache:SEU_SHORT_CODE`;
2. faça exatamente uma requisição e registre o tempo;
3. apague novamente;
4. repita muitas vezes com um script específico ou várias URLs.

Não apague o cache durante o teste quente. Misturar hits e misses sem controlar
a proporção torna o resultado difícil de interpretar.

Um teste mais realista teria muitas URLs e distribuição desigual: poucas
muito populares e muitas raramente acessadas.

## 13. Cuidado com a capacidade do worker

Com 500 eventos a cada 5 segundos, a drenagem máxima inicial é 100 eventos/s.
Autocannon pode gerar milhares por segundo.

Portanto, é normal observar:

```text
Req/Sec da API muito alto
LLEN click-events crescendo
```

Isso ensina que há duas capacidades diferentes:

- capacidade de atender redirecionamentos;
- capacidade de consolidar analytics.

Para um teste sustentado, ajuste batch/intervalo ou pare de gerar carga e
meça quanto tempo o worker leva para zerar a fila.

## 14. Limpeza do laboratório

Para remover somente os eventos da URL de teste:

```bash
docker compose --profile app stop worker
docker compose exec redis redis-cli LREM click-events 0 SEU_SHORT_CODE
docker compose exec redis redis-cli DEL url-cache:SEU_SHORT_CODE
docker compose --profile app start worker
```

Para apagar a URL de teste do PostgreSQL:

```bash
docker compose exec shortener-db psql -U admin -d shortener_db \
  -c "DELETE FROM \"Url\" WHERE \"shortCode\" = 'SEU_SHORT_CODE';"
```

Faça isso apenas com o código criado para o laboratório.

Parar tudo preservando volumes:

```bash
docker compose --profile app down
```

Reiniciar completamente e apagar dados:

```bash
docker compose --profile app down -v
```

`down -v` é destrutivo. Ele remove o banco e o AOF Redis locais.

## 15. O que você deve conseguir concluir

Ao terminar, responda com seus próprios números:

1. Quantas vezes o throughput aumentou?
2. Quanto a latência média caiu em porcentagem?
3. O p99 melhorou ou somente a média?
4. Qual parte trouxe mais ganho: cache ou fila?
5. Quanto a fila cresceu durante 30 segundos?
6. Quanto tempo o worker levou para drenar?
7. Qual container saturou em cada cenário?
8. O ganho se mantém com 10, 50, 100 e 200 conexões?

Essas respostas transformam “Redis é rápido” em evidência observada no seu
próprio sistema.
