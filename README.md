# DF FoundryVTT Welcome Screen

A simple NodeJS server that hosts a FoundryVTT server welcome page and user management.

## Server Configuration

The server settings can be found in the `config.jsonc` file.

```jsonc
{
	"server_title": "My Server",
	"server_port": "8080",
	"server_https": false,
	"ssl_key": "/path/to/privkey.pem",
	"ssl_cert": "/path/to/fullchain.pem",
	"fvtt_data": "/home/user/foundrydata",
	"fvtt_host": "http://localhost",
	"fvtt_port": 30000
}
```

|Field|Description|
|:-:|:-|
|`server_title`|The title that will display in the browser tab|
|`server_port`|The port that the node server runs on|
|`server_https`|Set to true if you are using HTTPS (if true, you must provide the SSL paths below)|
|`ssl_key`|SSL Key for HTTPS|
|`ssl_cert`|SSL Certificate for HTTPS|
|`fvtt_data`|This is the folder path to your FoundryVTT Data directory|
|`fvtt_host`|This is the IP address for domain name of the Foundry VTT server|
|`fvtt_port`|This is the port the Foundry VTT server is listening on. Foundry's default `localhost` port is normally 30000, but if you cannot access it on `localhost`, then this will either be 80 (http) or 443 (https)|

## Customize Welcome Page

The server is a simple ExpressJS server which uses JadeJS for layout templating. The main page template files can be found here:

- Jade Template: `"views/index.jade"`
- CSS: `"public/css/index.css"`
- JavaScript: `"public/js/index.js"`

Any images you wish to use can be placed in the `"public/images/"` directory and can be referenced via `"/images/my-image.png"` in the HTML/CSS/JS.