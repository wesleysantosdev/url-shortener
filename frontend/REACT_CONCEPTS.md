# React no projeto: conceitos e práticas

Este guia explica o React que realmente aparece no frontend. A ideia é ligar os
nomes técnicos ao fluxo do encurtador, sem criar abstrações que o projeto não usa.

## 1. Componentes: peças da interface

Um componente é uma função que recebe dados e descreve uma parte da tela.
Imagine peças de LEGO: cada peça tem um papel e a tela surge da composição.

```text
App
└── ShortenerView
    ├── FloatingCircles
    └── ShortenerForm
        └── ShortUrlHistory
            └── ShortUrlResult
```

`ShortenerForm` não implementa o layout geral, e `ShortUrlResult` não faz a
requisição. Essa separação mantém cada arquivo legível.

## 2. Props: dados entregues pelo componente pai

Props funcionam como argumentos de uma função. O histórico entrega cada item ao
resultado:

```tsx
<ShortUrlResult
  shortUrl={entry.shortUrl}
  originalUrl={entry.originalUrl}
  showStatus={false}
/>
```

O filho pode usar esses valores, mas não deve alterá-los. Quando o pai muda a
lista, React renderiza os filhos com novas props.

## 3. Estado: a memória viva do componente

`useState` guarda valores que mudam durante a interação:

```tsx
const [originalUrl, setOriginalUrl] = useState('')
const [submission, setSubmission] = useState({ status: 'idle' })
```

Uma variável comum seria recriada a cada render e sua mudança não avisaria o
React. O setter atualiza o valor e solicita outra renderização.

No formulário, estados separados representam responsabilidades diferentes:

- texto digitado;
- mensagem de validação;
- status da requisição;
- histórico da aba.

Não existe um booleano para cada possibilidade. `submission` é uma união de
estados (`idle`, `pending`, `success`, `error`), evitando combinações impossíveis
como “carregando e concluído ao mesmo tempo”.

## 4. Hooks usados

Hooks são funções React cujo nome começa com `use`.

### `useState`

Mantém estado local do formulário, histórico e feedback de cópia.

### Inicialização lazy

```tsx
const [history, setHistory] = useState(loadShortUrlHistory)
```

Passar a função, sem chamá-la, faz o `sessionStorage` ser lido apenas na primeira
renderização. `loadShortUrlHistory()` dentro de `useState` seria executado em
toda renderização, mesmo que React ignorasse o novo valor inicial.

### Atualização funcional

```tsx
setHistory((currentHistory) => {
  const nextHistory = addShortUrlToHistory(currentHistory, entry)
  saveShortUrlHistory(nextHistory)
  return nextHistory
})
```

A função recebe o estado mais recente. Isso evita usar uma cópia antiga capturada
antes de uma operação assíncrona.

### `useId`

`ShortUrlResult` usa `useId` para ligar `aria-labelledby` ao texto que nomeia a
região. O ID é estável e não depende do conteúdo da URL.

## 5. Input controlado

```tsx
<input
  value={originalUrl}
  onChange={(event) => setOriginalUrl(event.target.value)}
/>
```

O valor exibido vem do estado, e cada digitação atualiza esse estado. React é a
fonte da verdade da interface. Isso facilita validação, desabilitação durante a
requisição e mensagens acessíveis.

## 6. Eventos e operações assíncronas

`onSubmit` chama uma função que:

1. impede o reload padrão do formulário;
2. valida a URL com Zod;
3. marca o estado como `pending`;
4. espera `createShortUrl`;
5. atualiza histórico e `sessionStorage`;
6. mostra sucesso ou erro.

Enquanto está pendente, input e botão ficam desabilitados. Isso impede duas
criações acidentais da mesma interação.

## 7. Renderização condicional

React permite escolher o que aparece a partir do estado:

```tsx
{submission.status === 'error' ? (
  <p role="alert">{submission.message}</p>
) : null}
```

`role="alert"` anuncia erros; `role="status"` anuncia sucesso sem interromper o
leitor de tela. Elementos inexistentes não ficam apenas escondidos por CSS.

## 8. Lista e `key`

```tsx
{shortUrls.map((entry) => (
  <li key={entry.shortUrl}>...</li>
))}
```

A `key` ajuda React a reconhecer qual item continuou, entrou ou saiu da lista.
Cada link é único porque vem de um ID único do backend.

## 9. `sessionStorage`

O histórico usa uma chave versionada, `short-url-history:v2`, e armazena somente
os dois campos mostrados pela interface. A versão evita interpretar dados de um
contrato antigo como se fossem atuais.

Leitura, parse e escrita ficam dentro de `try/catch`, pois storage pode estar
indisponível. Se a escrita falhar, o estado em memória continua funcionando.

`sessionStorage` foi escolhido porque:

- sobrevive a reloads;
- é separado por aba;
- some quando a aba fecha;
- reduz a permanência de URLs originais, que podem conter parâmetros sensíveis.

## 10. API e Zod

O componente não chama `fetch` diretamente. `create-short-url.ts` concentra:

- método, headers e JSON da requisição;
- validação de `{ shortUrl }`;
- leitura de Problem Details;
- normalização de falhas de rede.

TypeScript descreve o que nosso código espera. Zod confirma o que o servidor
realmente enviou em runtime.

## 11. Context: por que não usamos?

Context distribui um valor para muitos descendentes sem passar props em cada
nível. Uma analogia é o sistema elétrico de uma casa: vários cômodos acessam a
mesma rede.

Este projeto não possui estado global. O histórico pertence ao formulário e é
usado pelo filho direto. Adicionar Context criaria provider, hook e dependência
global sem resolver um problema real. Se autenticação, tema configurável ou dados
compartilhados por telas surgirem, Context poderá ser reavaliado.

## 12. CSS Modules

Arquivos `*.module.css` geram nomes de classe locais. Dois componentes podem usar
`.button` sem colidir. `globals.css` fica reservado a tokens e regras globais.
O visual não depende do estado interno da API.

## 13. Testes pelo olhar do usuário

Testing Library procura elementos por papéis e nomes:

```tsx
screen.getByRole('button', { name: 'Shorten' })
screen.getByRole('alert')
```

Isso testa comportamento acessível, não detalhes como nome de função ou formato
do estado. Vitest simula `fetch`, Clipboard e storage apenas nas fronteiras.

## 14. Regra prática

Antes de adicionar um hook, Context ou biblioteca de estado, pergunte:

1. Qual componente realmente precisa desse dado?
2. Ele pode permanecer local?
3. É valor derivado que nem precisa virar estado?
4. Uma prop direta já resolve?
5. O teste descreve um comportamento que o usuário percebe?

No React, simplicidade também é arquitetura.
