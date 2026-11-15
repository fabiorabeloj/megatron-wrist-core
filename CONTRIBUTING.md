# Contributing
The first goal is a reproducible, small command-interface demo.

## Local checks
```sh
node --test tests/policy.test.mjs tests/session.test.mjs tests/demo.test.mjs
python -m unittest discover -s tests -p "test_*.py"
```

Describe the behavior you want to change, provide a small reproduction, and include a regression test when fixing parsing or session behavior. Keep changes focused.

Use synthetic commands and examples. Do not add real conversations, school records, personal identifiers, credentials, or files from the private FabioOS vault.

Please discuss new network, storage, hardware or LLM integrations before implementing them; they change the prototype's scope.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
