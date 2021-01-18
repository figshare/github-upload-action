# figshare upload GitHub action

### Upload datasets to your figshare account from GitHub workflows via this action.

This action requires an existing figshare.com article that will act as the figshare container for the uploaded files. For more information regarding figshare please visit our [homepage](https://figshare.com) and our [help pages](https://help.figshare.com/).
A figshare Personal Access Token is also required. Please check out the figshare help page for [instructions](https://help.figshare.com/article/how-to-get-a-personal-token) on obtaining a token.

## Usage

### Sample `workflow.yml`

```yaml
name: Upload to figshare
on: [push]
jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - uses: figshare/github-upload-action@v1
        with:
          FIGSHARE_TOKEN: ${{ secrets.FIGSHARE_TOKEN }}
          FIGSHARE_ENDPOINT: 'https://api.figshare.com/v2'
          FIGSHARE_ARTICLE_ID: 81345
          DATA_DIR: 'datasets'
```

## Action inputs

Any sensitive information like `FIGSHARE_TOKEN` should be [set as encrypted secrets](https://help.github.com/en/articles/virtual-environments-for-github-actions#creating-and-using-secrets-encrypted-variables).
The following inputs must be passed as environment variables.

| name                    | description                                                  |
| ----------------------- | ------------------------------------------------------------ |
| `FIGSHARE_TOKEN`        | (Required) Your figshare personal access token [More info here](https://help.figshare.com/article/how-to-get-a-personal-token)|
| `FIGSHARE_ENDPOINT`     | (Required) figshare API endpoint. Defaults to `https://api.figshare.com/v2` [More info here.](https://api.figshare.com) |
| `FIGSHARE_ARTICLE_ID`   | (Required) Existing figshare article ID. This action does not create any articles so it requires an existing article          |
| `DATA_DIR`              | (Required) The local directory containing the files you wish to upload into figshare. Nested directories are not supported|



## Action outputs

For every uploaded file an output entry will be generated:
| name                    | value                                           |description                                                                       |
|-------------------------|-------------------------------------------------|----------------------------------------------------------------------------------|
| `uploaded_file_{ID}`    | `https://ndownloader.figshare.com/files/{ID}`   | Figshare download URL for the uploaded file. `ID` is an internal figshare file ID|


## Testing locally

You can test run your workflow/actions locally via [act](https://github.com/nektos/act)
