# lmstudio-web-plugin

a plugin that allows ais to:

- search with searxng
- get content of websites

go to [the page on lmstudio hub](https://lmstudio.ai/withering/web) and press the run in lm studio to install

make sure you allow the json format in your `settings.yml` file in `/usr/local/searxng-docker/searxng/` or wherever yours is or else it will give a 403 forbidden error

```yml
search:
  formats:
    - html
    - json
```

also i really hate this @lmstudio/sdk its impossible to organize any code while using it
