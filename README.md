# lmstudio-web-plugin

make sure you allow the json format in your `settings.yml` file in `/usr/local/searxng-docker/searxng/` or wherever yours is or else it will give a 403 forbidden error

```yml
search:
  formats:
    - html
    - json
```

also i really hate this @lmstudio/sdk its impossible to organize any code while using it
