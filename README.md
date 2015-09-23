# PyLinkurious
[Linkurious.js](https://github.com/Linkurious/linkurious.js) integration with the [IPython Notebooks](http://ipython.org/notebook.html).

## Install

- `git clone git@github.com:Linkurious/PyLinkurious.git`
- Install [Node.js](http://nodejs.org/).
- Use `npm install` to install dependencies.

## Demo

Run `npm start` then open the basic example on your browser at http://localhost:8000/examples/basic.html.

### Integrating the Linkurious.js iframe

Add the following code in the HTML:

```html
<iframe name="pylinkurious-iframe"
  src="/path/to/pylinkurious.html?cb=setUpFrame"
  width="100%"
  height="500"
  frameborder="0"
  webkitallowfullscreen mozallowfullscreen allowfullscreen>
</iframe>
```

### Display your first graph

```js
// Function called once the iframe is initialized:
function setUpFrame() {

  // Get Linkurious.js instance:
  var LK = window.frames['pylinkurious-iframe'].LK;

  // Update UI components
  LK.updateUI();

  // Load a graph sample:
  LK.sigma.graph.read({
    nodes: [
      { id: 'n0' },
      { id: 'n1' }
    ],
    edges: [
      {
        id: 'e0',
        source: 'n0',
        target: 'n1'
      }
    ]
  });

  // Display the graph:
  LK.sigma.refresh();
  LK.plugins.locate.center();
}
```

### Browser Support

All modern web browsers are supported, including:
* Internet Explorer 10+
* Chrome 23+ and Chromium
* Firefox 15+
* Safari 6+

## External Dependencies

- [linkurious.js](https://github.com/Linkurious/linkurious.js)
- [mustache.js](https://github.com/janl/mustache.js)

Some optional linkurious.js plugins require extra libraries:

- [js-xlsx](https://github.com/SheetJS/js-xlsx/)
- [dagre](https://github.com/cpettitt/dagre)

## Status

Under development.

## License

PyLinkurious is released under the GNU General Public License v.3 ("GPL").
