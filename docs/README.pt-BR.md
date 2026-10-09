# MEGATRON Wrist Core
Protótipo de interface de comandos com estados visuais, entrada por texto, voz opcional e fila simulada em memória.

## Início rápido
Na raiz deste projeto:
```powershell
python serve_local.py
```
Abra http://127.0.0.1:8788/ e experimente `status`, `fila` e `anota revisar documentação`.

Python 3.12+ serve o app. Node.js 22+ roda os testes. Não precisa de chave de API, instalação NPM nem acesso ao FabioOS original.

A opção de simulação começa marcada. Ao desmarcá-la, a anotação entra somente na fila em memória desta aba. Recarregar zera essa fila.

## Voz e privacidade
O microfone inicia desligado. Para usar voz, ative-o e clique em **Ouvir um comando**. O navegador pode enviar áudio ao serviço de reconhecimento dele; voz offline não é garantida. Se preferir, use apenas texto.

## Testes
```powershell
node --test tests/policy.test.mjs tests/session.test.mjs tests/demo.test.mjs
python -m unittest discover -s tests -p "test_*.py"
```

## Limites
Fila fictícia, interpretação limitada de frases e nenhuma execução de tarefas. Não há conexão com MEGATRON real, WhatsApp, n8n, LLM ou relógio. A política de comandos não substitui segurança em uma integração real.

A licença ainda está em definição. Consulte [COPYRIGHT.md](../COPYRIGHT.md).
