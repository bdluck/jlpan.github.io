---
sidebar: auto
prev: /
---
# Options11

## dateFormat

- Type: `string`
- Default: `YYYY-MM-DD`

The [date](./front-matter.md#date) will be displayed in the layout with this format.
You can find all available formats [here](https://github.com/iamkun/dayjs/blob/dev/docs/en/API-reference.md#displaying)

e.g.

```js
module.exports = {
  themeConfig: {
    dateFormat: 'YYYY-MM-DD'
  }
}
```

## nav

- Type: `Array<{ text: string, link: string }>`
- Default: `See below`

Links you wish to be displayed at navbar.

Here's the default:

```js
module.exports = {
  themeConfig: {
    nav: [
      {
        text: 'Blog',
        link: '/',
      },
      {
        text: 'Tags',
        link: '/tag/',
      },
    ]
  },
}
```

## footer

### footer.contact


- Type: `Array<{ type: ContactType, link: string }>`
- Default: `undefined`

Contact information, displayed on the left side of footer.
