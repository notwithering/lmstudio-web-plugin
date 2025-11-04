# lmstudio-web-plugin

a plugin that allows ais to:

- search with searxng
- get content of websites

# installing

go to [the page on lmstudio hub](https://lmstudio.ai/withering/web) and press the run in lm studio to install

make sure you allow the json format in your `settings.yml` file in `/usr/local/searxng-docker/searxng/` or wherever yours is or else it will give a 403 forbidden error

```yml
search:
  formats:
    - html
    - json
```

if you dont want to host your own instance you can use other peoples instances only if they allow the json format, such as search.canine.tools, just set the base url to `https://search.canine.tools/search` and it should work, but i highly recommend hosting your own instance as it is much faster and not rate limited

---

p.s. @lmstudio/sdk is likely the least developer friendly sdk ive ever used
