/**
 * Copyright Linkurious SAS 2012 - 2015
 * Created by Sebastien Heymann on 12/08/2015.
 */
'use strict';

var LK = Object.create(null); // namespace

(function(undefined) {

  if (typeof sigma === 'undefined')
    throw 'sigma is not declared';

  var sigmaInstance,
    activeStatePlugin,
    designPlugin,
    selectPlugin,
    tooltipsPlugin,
    locatePlugin,
    sigmaContainer,
    initialized = false,
    NB_SEARCH_RESULTS = 5;

  // Available query parameters: "ui", "forceui", "graph", "cb"
  // - ui: features, availables values are "search","share","fullscreen","zoom","layout"
  // - graph: URL to the graph in JSON file format
  // - cb: callback function from the parent window
  var queryString = getQueryString(location.search.substr(1)); // substr removes "?"

  var settings = {
    /**
     * POWEREDBY SETTINGS:
     * *******************
     */
    poweredByHTML: '<img src="images/favicon-16x16.png" width="16" height="16"> Powered by Linkurious',
    poweredByURL: 'https://linkurio.us',

    /**
     * RENDERERS SETTINGS:
     * *******************
     */
    defaultEdgeType: 'tapered',
    // Labels:
    font: 'Roboto',
    defaultLabelColor: '#000',
    defaultLabelSize: 11,
    labelThreshold: 5,
    labelAlignment: 'center',
    defaultEdgeLabelSize: 11,
    edgeLabelThreshold: 4,
    labelHoverShadow: '',
    edgeLabelHoverShadow: '',
    // Edges:
    edgeColor: 'default',
    defaultEdgeColor: '#a9a9a9',
    // Nodes:
    defaultNodeColor: '#999999',
    // Hovered nodes:
    hoverFontStyle: 'bold',
    borderSize: 2,
    outerBorderSize: 4,
    nodeBorderColor: 'default',
    defaultNodeBorderColor: '#ffffff',
    defaultNodeOuterBorderColor: '#f65565',
    nodeHoverLevel: 1,
    // Hovered edges:
    edgeHoverExtremities: true,
    edgeHoverLevel: 1,
    // Actve nodes and edges:
    activeFontStyle: 'bold',
    nodeActiveColor: 'node',
    defaultNodeActiveColor: '#999999',
    nodeActiveLevel: 3,
    edgeActiveColor: 'default',
    defaultEdgeActiveColor: '#f65565',
    edgeActiveLevel: 3,

    // Halo:
    nodeHaloSize: 25,
    edgeHaloSize: 20,
    nodeHaloColor: '#ffffff',
    edgeHaloColor: '#ffffff',
    nodeHaloStroke: true,
    nodeHaloStrokeColor: '#a9a9a9',
    nodeHaloStrokeWidth: 0.5,

    // Node images:
    imgCrossOrigin: 'anonymous',

    /**
     * RESCALE SETTINGS:
     * *****************
     */
    minNodeSize: 5,
    maxNodeSize: 5,
    minEdgeSize: 2,
    maxEdgeSize: 2,

    /**
     * CAPTORS SETTINGS:
     * *****************
     */
    zoomingRatio: 1.382,
    doubleClickZoomingRatio: 1.7,
    zoomMin: 0.1,
    zoomMax: 10,
    doubleClickZoomDuration: 200,

    /**
     * GLOBAL SETTINGS:
     * ****************
     */
    autoRescale: ['nodeSize', 'edgeSize'],
    doubleClickEnabled: true,
    enableEdgeHovering: true,
    edgeHoverPrecision: 10,
    approximateLabelWidth: true,

    /**
     * CAMERA SETTINGS:
     * ****************
     */
    nodesPowRatio: 0.8,
    edgesPowRatio: 0.8,

    /**
     * ANIMATIONS SETTINGS:
     * ********************
     */
    animationsTime: 1000
  };

  var tooltipsSettings = {
    node: {
      show: 'clickNode',
      hide: 'clickStage',
      cssClass: 'sigma-tooltip',
      position: 'top',
      autoadjust: true
    },
    edge: {
      show: 'clickEdge',
      hide: 'clickStage',
      cssClass: 'sigma-tooltip',
      position: 'top',
      autoadjust: true
    }
  };

  LK.content = {};


  /**
   * Initialize the widget. It should be called only once.
   */
  LK.widget = function() {
    if(initialized) return;

    initialized = true;
    sigmaContainer = LK.dom.$('graph-canvas');

    sigmaInstance = new sigma({
      renderer: {
        container: sigmaContainer,
        type: 'canvas'
      },
      settings: settings
    });

    // ------------------------------------------------------------------------------------------
    //                                  LOAD GRAPH
    // ------------------------------------------------------------------------------------------

    if (typeof widgetData !== 'string' && widgetData.content) {
      LK.content = widgetData.content;
      sigmaInstance.graph.read(LK.content.graph);
      sigmaInstance.refresh();
    }
    else if (queryString.graph) {
      sigma.parsers.json(
        queryString.graph,
        sigmaInstance,
        function() {
          sigmaInstance.refresh();
        }
      );
    }

    // ------------------------------------------------------------------------------------------
    //                                  SIGMA PLUGINS
    // ------------------------------------------------------------------------------------------

    // Instantiate the Keyboards plugin:
    sigma.plugins.keyboard(sigmaInstance, sigmaInstance.renderers[0], {
      zoomingRatio: 1.3
    });

    designPlugin = sigma.plugins.design(sigmaInstance);

    if (LK.content && LK.content.styles && LK.content.palette) {
      LK.setDesign(LK.content.styles, LK.content.palette);
    }

    activeStatePlugin = sigma.plugins.activeState(sigmaInstance);
    selectPlugin = sigma.plugins.select(sigmaInstance, activeStatePlugin, sigmaInstance.renderers[0]);

    // Instantiate the Locate plugin:
    locatePlugin = sigma.plugins.locate(sigmaInstance, {
      animation: {
        node: {
          duration: 800
        },
        edge: {
          duration: 800
        },
        center: {
          duration: 800
        }
      },
      padding: {
        top: 60,
        right: 20,
        bottom: 20,
        left: 20
      },
      focusOut: false,
      zoomDef: 0.3
    });

    if (sigmaInstance.graph.nodes().length) {
      locatePlugin.center();
    }

    var renderHalo = function() {
      var nodes = [];
      activeStatePlugin.nodes().forEach(function(node) {
        nodes = nodes.concat(sigmaInstance.graph.adjacentNodes(node.id));
      });
      nodes.concat(activeStatePlugin.nodes());

      activeStatePlugin.edges().forEach(function(edge) {
        nodes.push(sigmaInstance.graph.nodes(edge.source));
        nodes.push(sigmaInstance.graph.nodes(edge.target));
      });

      // TODO remove duplicates from nodes

      sigmaInstance.renderers[0].halo({
        nodes: nodes
      });
    };

    sigmaInstance.renderers[0].bind('render', function() {
      renderHalo();
    });

    //ACTIVE EVENTS
    activeStatePlugin.bind('activeNodes', function () {
      renderHalo();
    });
    activeStatePlugin.bind('activeEdges', function () {
      renderHalo();
    });

    // Instantiate the PoweredBy plugin:
    sigmaInstance.renderers[0].poweredBy();

    // Instantiate the tooltips plugin with a Mustache renderer
    var tooltipsNodeTmpl = LK.dom.$('tooltip-node').innerHTML;
    Mustache.parse(tooltipsNodeTmpl);   // optional, speeds up future uses
    tooltipsSettings.node.template = tooltipsNodeTmpl;
    tooltipsSettings.node.renderer = function(node, template) {
      node = mustachPrepare(node, 'node');
      return Mustache.render(template, node);
    };

    var tooltipsEdgeTmpl = LK.dom.$('tooltip-edge').innerHTML;
    Mustache.parse(tooltipsEdgeTmpl);   // optional, speeds up future uses
    tooltipsSettings.edge.template = tooltipsEdgeTmpl;
    tooltipsSettings.edge.renderer = function(edge, template) {
      edge = mustachPrepare(edge, 'edge');
      return Mustache.render(template, edge);
    };

    tooltipsPlugin = sigma.plugins.tooltips(sigmaInstance, sigmaInstance.renderers[0], tooltipsSettings);


    sigmaInstance.bind('hovers', function (event) {
      if(event.data.enter.nodes.length) {
        // Add the 'hover' class to the DOM container:
        if (-1 == sigmaContainer.className.indexOf('hoverNodes')) {
          sigmaContainer.className += ' hoverNodes';
        }
      }
      else if(event.data.enter.edges.length) {
        // Add the 'hover' class to the DOM container:
        if (-1 == sigmaContainer.className.indexOf('hoverEdges')) {
          sigmaContainer.className += ' hoverEdges';
        }
      }
      else if(event.data.leave.nodes.length || event.data.leave.edges.length) {
        // Remove the 'hover' class from the DOM container:
        sigmaContainer.className = sigmaContainer.className.replace(' hoverNodes', '');
        // Remove the 'hover' class from the DOM container:
        sigmaContainer.className = sigmaContainer.className.replace(' hoverEdges', '');
      }
    });

    // public access for iframe parent:
    LK.sigma = sigmaInstance;
    LK.plugins = {
      activeState: activeStatePlugin,
      design: designPlugin,
      locate: locatePlugin,
      select: selectPlugin,
      tooltips: tooltipsPlugin
    };

    if (queryString.cb && typeof window.parent[queryString.cb] === 'function') {
      window.parent[queryString.cb]();
    }

    if (widgetData.title) {
      document.title = widgetData.title + ' - PyLinkurious';
    }
    if (LK.content) {
      if (LK.content.description) {
        var elt = LK.dom.all('meta[name=description]')[0];
        if (elt) {
          elt.parentNode.removeChild(elt);
        }
        elt = document.createElement('meta');
        elt.name = 'description';
        elt.content = LK.content.description;
        LK.dom.all('head')[0].appendChild(elt);
      }
      if (widgetData.url) {
        LK.dom.$('url').value = widgetData.url;
      }
      if (widgetData.url) {
        LK.dom.$('code').value = getWidgetCode(
          widgetData.url,
          widgetData.title,
          LK.content.description
        );
      }
    }

    LK.updateUI();

    // In case the WebGL renderer is used, we must wait for FontAwesome to be loaded.
    // http://www.w3.org/TR/css-font-loading/
    if (document.fonts) {
      // document.fonts.ready() method is going to be replaced with
      // document.fonts.ready attribute in the future.
      var fontsReady = document.fonts.ready;
      if (typeof(fontsReady) == "function") {
        fontsReady = document.fonts.ready();
      }
      fontsReady.then(function() {
        LK.sigma.refresh({ skipIndexation:true });
      });
    }
    else { // wait
      // TODO use a polyfill such as:
      // https://github.com/zachleat/fontfaceonload
      // https://github.com/smnh/FontLoader
      setTimeout(function() {
        LK.sigma.refresh({ skipIndexation:true });
      }, 2000);
    }

    return true;
  };

  /**
   * Manually open a tooltip on a node.
   * @param node
   */
  LK.openNodeTooltip = function(node) {
    var prefix = 'renderer1:';
    tooltipsPlugin.open(node, tooltipsSettings.node, node[prefix + 'x'], node[prefix + 'y']);
  };

  /**
   * Manually open a tooltip on an edge.
   * @param edge
   */
  LK.openEdgeTooltip = function(edge) {
    var prefix = 'renderer1:',
      source = sigmaInstance.graph.nodes(edge.source),
      target = sigmaInstance.graph.nodes(edge.target),
      x = (source[prefix + 'x'] + target[prefix + 'x']) * 0.5,
      y = (source[prefix + 'y'] + target[prefix + 'y']) * 0.5;
    tooltipsPlugin.open(edge, tooltipsSettings.edge, x, y);
  };

  /**
   * Close the current tooltip.
   */
  LK.closeTooltip = function() {
    tooltipsPlugin.close();
  };

  // ------------------------------------------------------------------------------------------
  //                                  SEARCH FUNCTIONS
  // ------------------------------------------------------------------------------------------

  LK.searchType = 'nodes';

  /**
   * Create the footer of the search results list.
   * @param {DOMElement} parentElt
   * @param {number} tabIndex
   */
  function createFooterElt (parentElt, tabIndex) {
    var elt = document.createElement('p');
    elt.className = 'autocomplete_dropdown_item btn';
    elt.tabIndex = tabIndex;

    if (LK.searchType === 'nodes') {
      elt.appendChild( document.createTextNode('Show edges') );
      elt.onclick = function() {
        LK.search('edges');
      };
      elt.addEventListener('keydown', function(event) {
        switch (event.which) {
          case 13:  // select on Enter key pressed
            LK.search('edges');
            LK.dom.$('result-list__dropdown').firstChild.focus();
            break;
          case 38:  // up arrow
            if (this.previousSibling) this.previousSibling.focus();
            else this.parentNode.lastChild.focus();
            break;
          case 40:  // down arrow
          case 9: // TAB
            this.parentNode.firstChild.focus();
            break;
          default:
            LK.dom.$('result-list__input').focus();
        }
        event.preventDefault();
        if (event.which != 9) {
          event.stopPropagation();
        }
      });
    }
    else {
      elt.appendChild( document.createTextNode('Show nodes') );
      elt.onclick = function() {
        LK.search('nodes');
      };
      elt.addEventListener('keydown', function(event) {
        switch (event.which) {
          case 13:  // select on Enter key pressed
            LK.search('nodes');
            LK.dom.$('result-list__dropdown').firstChild.focus();
            break;
          case 38:  // up arrow
            if (this.previousSibling) this.previousSibling.focus();
            else this.parentNode.lastChild.focus();
            break;
          case 40:  // down arrow
          case 9: // TAB
            this.parentNode.firstChild.focus();
            break;
          default:
            LK.dom.$('result-list__input').focus();
        }
        event.preventDefault();
        if (event.which != 9) {
          event.stopPropagation();
        }
      });
    }

    parentElt.appendChild(elt);
  }

  /**
   * Search nodes or edges.
   * @param type 'nodes' | 'edges'
   */
  LK.search = function(type) {
    LK.searchType = type || LK.searchType;
    var q = LK.dom.$('result-list__input').value;

    if (q.length) {
      var nodesMatches,
        edgesMatches,
        elt,
        e,
        resultList,
        tabindex = 100;

      // Empty the list of results
      resultList = LK.dom.$('result-list__dropdown');
      while (resultList.lastChild) {
        resultList.removeChild(resultList.lastChild);
      }

      // Search nodes
      if (LK.searchType === 'nodes') {
        nodesMatches = graphSearch(q, sigmaInstance.graph.nodes())
          .slice(0, NB_SEARCH_RESULTS)
          .map(function(match) {

            elt = document.createElement('p');
            elt.dataset.id = match.item.id;
            elt.className = 'autocomplete_dropdown_item';
            elt.tabIndex = tabindex++;
            elt.onclick = nodeResultHandler;
            elt.addEventListener('keydown', function(event) {
              switch (event.which) {
                case 13:  // select on Enter key pressed
                  nodeResultHandler.apply(this);
                  break;
                case 38:  // up arrow
                  if (this.previousSibling) this.previousSibling.focus();
                  else this.parentNode.lastChild.focus();
                  break;
                case 40:  // down arrow
                  if (this.nextSibling) this.nextSibling.focus();
                  else this.parentNode.firstChild.focus();
                  break;
                case 9: // TAB
                  break;
                default:
                  LK.dom.$('result-list__input').focus();
              }
              if (event.which != 9) {
                event.preventDefault();
                event.stopPropagation();
              }
            });
            elt.appendChild( document.createTextNode(match.item.label) );
            return elt;
          });

        for ( e = 0; e < nodesMatches.length; e++ ) {
          resultList.appendChild(nodesMatches[e]);
        }

        if (!nodesMatches.length) {
          elt = document.createElement('p');
          elt.className = 'autocomplete_dropdown_item';
          elt.tabIndex = tabindex++;
          elt.appendChild( document.createTextNode('0 nodes found.') );
          resultList.appendChild(elt);
        }
      }

      // Search edges
      if (LK.searchType === 'edges') {
        edgesMatches = graphSearch(q, sigmaInstance.graph.edges())
          .slice(0, NB_SEARCH_RESULTS)
          .map(function(match) {

            elt = document.createElement('p');
            elt.dataset.id = match.item.id;
            elt.className = 'autocomplete_dropdown_item';
            elt.tabIndex = tabindex++;
            elt.onclick = edgeResultHandler;
            elt.addEventListener('keydown', function(event) {
              switch (event.which) {
                case 13:  // select on Enter key pressed
                  edgeResultHandler.apply(this);
                  break;
                case 38:  // up arrow
                  if (this.previousSibling) this.previousSibling.focus();
                  else this.parentNode.lastChild.focus();
                  break;
                case 40:  // down arrow
                  if (this.nextSibling) this.nextSibling.focus();
                  else this.parentNode.firstChild.focus();
                  break;
                case 9: // TAB
                  break;
                default:
                  LK.dom.$('result-list__input').focus();
              }
              if (event.which != 9) {
                event.preventDefault();
                event.stopPropagation();
              }
            });
            elt.appendChild( document.createTextNode(match.item.label) );
            return elt;
          });

        for ( e = 0; e < edgesMatches.length; e++ ) {
          resultList.appendChild( edgesMatches[e] );
        }

        if (!edgesMatches.length) {
          elt = document.createElement('p');
          elt.className = 'autocomplete_dropdown_item';
          elt.tabIndex = tabindex++;
          elt.appendChild( document.createTextNode('0 edges found.') );
          resultList.appendChild(elt);
        }
      }

      createFooterElt(resultList, tabindex++);

      LK.dom.show('#autocomplete__reset');
      LK.dom.show('#result-list__dropdown');
    }
    else LK.clearSearch();
  };

  /**
   * Clear search result.
   */
  LK.clearSearch = function() {
    LK.dom.hide('#autocomplete__reset');
    LK.dom.hide('#result-list__dropdown');
    LK.dom.$('result-list__input').value = '';
    LK.dom.$('result-list__input').focus();
    //Clear results
    var resultList = LK.dom.$('result-list__dropdown');
    while (resultList.lastChild) {
      resultList.removeChild(resultList.lastChild);
    }
  };

  document.getElementById('result-list__input').addEventListener('keydown', function(event) {

    if (event.which == 13) {
      // Select the first result in the list on Enter key pressed:
      if (LK.dom.$('result-list__dropdown').children.length) {
        LK.dom.$('result-list__dropdown').firstChild.focus();
        LK.dom.$('result-list__dropdown').firstChild.click();
      }
      // Avoid submit when enter is pressed:
      event.preventDefault();
      event.stopPropagation();
    }

    if (!LK.dom.$('result-list__dropdown').children.length) return;

    // Focus on first result item:
    if (event.which == 9 || event.which == 40) { // TAB key or down arrow
      LK.dom.$('result-list__dropdown').firstChild.focus();
      event.preventDefault(); // avoid double-tabbing on TAB key pressed
    }
    event.stopPropagation();
  }, false);


  // ------------------------------------------------------------------------------------------
  //                                  LAYOUT FUNCTIONS
  // ------------------------------------------------------------------------------------------

  /**
   * Start/stop the ForceLink layout.
   */
  LK.toggleLayout = function() {
    var btnElt = LK.dom.$('viewController-layout').children[0];
    if (sigma.layouts.isForceLinkRunning()) {
      sigma.layouts.stopForceLink();
      btnElt.className = btnElt.className.replace('fa-pause', 'fa-play');
    }
    else {
      var nodesCount = sigmaInstance.graph.nodes().length,
        scalingRatio = 2,
        gravity = (nodesCount > 250) ? (2 * nodesCount) / 100 : 2.5;

      // TODO replace by a more qualitative layout on graphs < 50 nodes
      if (nodesCount > 50) {
        scalingRatio = 2.5;
      } else if (nodesCount > 10) {
        scalingRatio = 5;
      } else if (nodesCount > 3) {
        scalingRatio = 10;
      } else if (nodesCount > 2) {
        scalingRatio = 30;
      } else {
        scalingRatio = 50;
      }

      if (!nodesCount) return;

      sigma.layouts.configForceLink(sigmaInstance, {
        autoStop: true,
        background: true,
        maxIterations: 1500,
        avgDistanceThreshold: 0.00001,
        linLogMode: true,
        barnesHutOptimize: (nodesCount > 1000),
        easing: 'cubicInOut',
        scalingRatio: scalingRatio,
        gravity: gravity,
        randomize: 'locally',
        randomizeFactor: 30,
        alignNodeSiblings: (nodesCount > 3),
        nodeSiblingsScale: 8,
        nodeSiblingsAngleMin: 0.3
      })
        .bind('interpolate stop', function(){
          btnElt.className = btnElt.className.replace('fa-pause', 'fa-play');
        });

      btnElt.className = btnElt.className.replace('fa-play', 'fa-pause');
      sigma.layouts.startForceLink();
    }
  };


  // ------------------------------------------------------------------------------------------
  //                                  DESIGN FUNCTIONS
  // ------------------------------------------------------------------------------------------

  /**
   * Clear current design, load new styles and palette, and apply.
   * @param styles
   * @param palette
   */
  LK.setDesign = function(styles, palette) {
    designPlugin.clear();
    designPlugin.setPalette(palette);
    designPlugin.setStyles(styles);

    if (styles.nodes && styles.nodes.icon) {
      sigmaInstance.settings('labelAlignment', 'right');
    }
    else {
      sigmaInstance.settings('labelAlignment', '');
    }

    designPlugin.apply();
  };


  // ------------------------------------------------------------------------------------------
  //                                  CAMERA FUNCTIONS
  // ------------------------------------------------------------------------------------------

  /**
   * Zoom on the specified node.
   * @param id The node id.
   * @param options
   */
  LK.locateNode = function(id, options) {
    locatePlugin.nodes(id, options);
  };

  /**
   * Zoom on the specified edge.
   * @param id The edge id.
   * @param options
   */
  LK.locateEdge = function(id, options) {
    locatePlugin.edges(id, options);
  };

  LK.zoomOut = function() {
    sigma.utils.zoomTo(
      sigmaInstance.camera,
      0,
      0,
      1 / sigmaInstance.settings('zoomingRatio'),
      { duration: 300 }
    );
  };

  LK.zoomIn = function() {
    sigma.utils.zoomTo(
      sigmaInstance.camera,
      0,
      0,
      sigmaInstance.settings('zoomingRatio'),
      { duration: 300 }
    );
  };

  /**
   * Reset the camera zoom and position.
   */
  LK.zoomCenter = function() {
    sigma.utils.zoomTo(
      sigmaInstance.camera,
      0,
      0,
      1,
      { duration: 300 }
    );
  };

  /**
   * Display the graph in full screen mode.
   */
  LK.fullscreen = function() {
    sigmaInstance.renderers[0].fullScreen();
  };


  // ------------------------------------------------------------------------------------------
  //                                  SHARE FUNCTIONS
  // ------------------------------------------------------------------------------------------

  /**
   * Open the Share modal
   */
  LK.share = function() {
    LK.dom.show('#share-overlay');
  };

  /**
   * Close the Share modal
   */
  LK.closeShareOverlay = function() {
    LK.dom.hide('#share-overlay');
  };

  // ------------------------------------------------------------------------------------------
  //                                  DOM UTILITY FUNCTIONS
  // ------------------------------------------------------------------------------------------

  LK.dom = {
    /**
     * Get the DOM element by id.
     * @param {string} id
     * @returns {Element}
     */
    $: function (id) {
      return document.getElementById(id);
    },

    /**
     * Get a set of DOM elements by CSS selectors.
     * @param {string} selectors The CSS selectors.
     * @returns {NodeList}
     */
    all: function (selectors) {
      return document.querySelectorAll(selectors);
    },

    /**
     * Remove the specified CSS class from the specified DOM elements.
     * @param {string} selectors The CSS selectors.
     * @param {string} cssClass
     */
    removeClass: function(selectors, cssClass) {
      var nodes = document.querySelectorAll(selectors);
      var l = nodes.length;
      for (var i = 0 ; i < l; i++ ) {
        var el = nodes[i];
        // Bootstrap compatibility
        el.className = el.className.replace(cssClass, '');
      }
    },

    /**
     * Add the specified CSS class to the specified DOM elements.
     * @param {string} selectors The CSS selectors.
     * @param {string} cssClass
     */
    addClass: function (selectors, cssClass) {
      var nodes = document.querySelectorAll(selectors);
      var l = nodes.length;
      for (var i = 0 ; i < l; i++ ) {
        var el = nodes[i];
        // Bootstrap compatibility
        if (-1 == el.className.indexOf(cssClass)) {
          el.className += ' ' + cssClass;
        }
      }
    },

    /**
     * Remove the CSS class "hidden" from the specified DOM elements.
     * @param {string} selectors The CSS selectors.
     */
    show: function (selectors) {
      this.removeClass(selectors, 'hidden');
    },

    /**
     * Add the CSS class "hidden" to the specified DOM elements.
     * @param {string} selectors The CSS selectors.
     */
    hide: function (selectors) {
      this.addClass(selectors, 'hidden');
    },

    /**
     * Toggle the visibility of the specified DOM elements.
     * @param {string} selectors The CSS selectors.
     * @param {string} [cssClass] the optional CSS class. Default: "hidden"
     */
    toggle: function (selectors, cssClass) {
      var cssClass = cssClass || "hidden";
      var nodes = document.querySelectorAll(selectors);
      var l = nodes.length;
      for (var i = 0 ; i < l; i++ ) {
        var el = nodes[i];
        //el.style.display = (el.style.display != 'none' ? 'none' : '' );
        // Bootstrap compatibility
        if (-1 !== el.className.indexOf(cssClass)) {
          el.className = el.className.replace(cssClass, '');
        } else {
          el.className += ' ' + cssClass;
        }
      }
    }
  };

  // ------------------------------------------------------------------------------------------
  //                                  WIDGET PARAMETERS
  // ------------------------------------------------------------------------------------------

  /**
   * All UI features are displayed if "ui" is missing, otherwise we display the listed features only.
   */
  LK.updateUI = function() {
    if ('forceui' in queryString) {
      LK.dom.addClass('#searchbar', 'always-opaque');
      LK.dom.addClass('#viewController', 'always-opaque');
    }
    if ('ui' in queryString) {
      if (queryString.ui.indexOf('search') != -1) {
        LK.dom.show('#searchbar');
      }
      if (queryString.ui.indexOf('share') != -1) {
        LK.dom.show('#viewController-share');
      }
      if (queryString.ui.indexOf('layout') != -1) {
        LK.dom.show('#viewController-layout');
      }
      if (queryString.ui.indexOf('fullscreen') != -1) {
        LK.dom.show('#viewController-fullscreen');
      }
      if (queryString.ui.indexOf('zoom') != -1) {
        LK.dom.show('#viewController-zoomin');
        LK.dom.show('#viewController-zoomout');
      }
    }
    else if ('ui' in LK.content) {
      if (LK.content.ui.search) {
        LK.dom.show('#searchbar');
      }
      if (LK.content.ui.share) {
        LK.dom.show('#viewController-share');
      }
      if (LK.content.ui.layout) {
        LK.dom.show('#viewController-layout');
      }
      if (LK.content.ui.fullscreen) {
        LK.dom.show('#viewController-fullscreen');
      }
      if (LK.content.ui.zoom) {
        LK.dom.show('#viewController-zoomin');
        LK.dom.show('#viewController-zoomout');
      }
    }
    else {
      LK.dom.show('#searchbar');
      LK.dom.show('#viewController-share');
      LK.dom.show('#viewController-layout');
      LK.dom.show('#viewController-fullscreen');
      LK.dom.show('#viewController-zoomin');
      LK.dom.show('#viewController-zoomout');
    }
  };


  // ------------------------------------------------------------------------------------------
  //                                  DRAG'N'DROP FILES
  // ------------------------------------------------------------------------------------------

  // see http://www.html5rocks.com/en/tutorials/file/dndfiles/

  /**
   * Close the Drag modal
   */
  LK.closeDragOverlay = function() {
    LK.dom.hide('#drag-overlay');
  };


  document.ondragover = function (e) {
    e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    LK.dom.show('#drag-overlay');
    return false;
  };

  document.ondrop = onDropHandler;

  document.getElementById('drop-zone-graph').ondragover = function (e) {
    LK.dom.addClass('#drop-zone-graph', 'dragover');
  };

  document.getElementById('drop-zone-graph').ondragleave = function (e) {
    LK.dom.removeClass('#drop-zone-graph', 'dragover');
  };

  document.getElementById('drop-zone-graph').ondrop = onDropHandler;

  document.getElementById('drop-zone-design').ondragover = function (e) {
    LK.dom.addClass('#drop-zone-design', 'dragover');
  };

  document.getElementById('drop-zone-design').ondragleave = function (e) {
    LK.dom.removeClass('#drop-zone-design', 'dragover');
  };

  document.getElementById('drop-zone-design').ondrop = onDropHandler;


  // ------------------------------------------------------------------------------------------
  //                                  RUN WIDGET
  // ------------------------------------------------------------------------------------------

  document.addEventListener("DOMContentLoaded", function() {
    LK.widget();
  });

  // ------------------------------------------------------------------------------------------
  //                                  PRIVATE FUNCTIONS
  // ------------------------------------------------------------------------------------------

  /**
   * Generate the widget iframe code.
   * @param {string} url
   * @param {string} title
   * @param {string} description
   * @returns {string}
   */
  function getWidgetCode(url, title, description) {
    var title = title || '';
    var description = description || '';

    var iframe = '<iframe src="' + url + '" width="100%" height="330" frameborder="0" ' +
      ' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>' +
      '<p><a href="' + url + '" target="_blank">' + title + '</a> on ' +
      '<a href="https://linkurio.us" target="_blank">Linkurious</a>.</p>';

    if (description.length) {
      iframe += '<p>' + description + '</p>';
    }
    return iframe;
  }

  /**
   * Format the node or edge data for Mustache.
   * @param item
   * @param type 'node' or 'edge'
   * @return     The modified item.
   */
  function mustachPrepare(item, type) {
    // see http://stackoverflow.com/a/9058774/
    item.mustacheProperties = [];
    item.mustacheCategories = [];

    if(item.data) {
      for (var prop in item.data.properties){
        if (item.data.properties.hasOwnProperty(prop)){
          item.mustacheProperties.push({
            'key' : prop,
            'value' : item.data.properties[prop]
          });
        }
      }
      if (type === 'node') {
        for (var prop in item.data.categories){
          if (item.data.categories.hasOwnProperty(prop)){
            item.mustacheCategories.push(item.data.categories[prop]);
          }
        }
      }
      else {
        item.mustacheCategories = [item.data.type];
      }
    }

    return item;
  }

  /**
   * Search on sigma nodes or sigma edges.
   * @param {string} q The query string.
   * @param {array} items Nodes or edges.
   * @returns {array}
   */
  function graphSearch(q, items) {
    q = q.trim().toLowerCase();

    return items.map(function(item) {
      return {
        item: item,
        score: fuzzysearch(q, (item.label || '').trim().toLowerCase(), 3)
      };
    }).filter(function(res) {
      return res.score != Number.POSITIVE_INFINITY;
    }).sort(function(a, b) {
      return a.score - b.score;
    });
  }


  /**
   * Fuzzy searching allows for flexibly matching a string with partial input,
   * useful for filtering data very quickly based on lightweight user input.
   * Returns score lower than Infinity if needle matches haystack using a fuzzy-searching algorithm.
   * Note that this program doesn't implement levenshtein distance, but rather
   * a simplified version where there's no approximation. The method will return a score lower
   * than Infinity only if each character in the needle can be found in the haystack and
   * occurs after the preceding matches. To sum up:
   *   - score = +Inf: not a match.
   *   - score > 0: number of characters read before finding the last character of needle
   *                (doesn't count the characters of needle).
   *   - score = 0: the needle is a substring of haystack.
   *   - score < 0: perfect match.
   *
   * @see https://github.com/bevacqua/fuzzysearch (modified)
   * @param {string} needle
   * @param {string} haystack
   * @param {number} cutoff  The maximum score before Infinity.
   * @returns {number} score
   */
  function fuzzysearch (needle, haystack, cutoff) {
    var
      hlen = haystack.length,
      nlen = needle.length,
      hops = - needle.length + 1,
      hops_limit = cutoff || 10,
      incr = 0,
      nch, i, j;

    if (nlen > hlen) {
      return Number.POSITIVE_INFINITY;
    }
    if (nlen === hlen) {
      return (needle === haystack) ? -1 : Number.POSITIVE_INFINITY;
    }
    if (nlen == 1) {
      hops = haystack.indexOf(needle);
      return (hops < 0) ? Number.POSITIVE_INFINITY : hops;
    }
    outer: for (i = 0, j = 0; i < nlen; i++) {
      nch = needle.charCodeAt(i);
      while (j < hlen) {
        hops += incr;
        if (incr && hops > hops_limit) {
          return Number.POSITIVE_INFINITY;
        }
        if (haystack.charCodeAt(j++) === nch) {
          incr = 1;
          continue outer;
        }
      }
      return Number.POSITIVE_INFINITY;
    }

    return hops;
  }

  /**
   * Select a node from the list of search results. It should be called by an event on the item.
   * @returns {boolean}
   */
  function nodeResultHandler() {
    var id = this.dataset.id;
    activeStatePlugin.dropNodes();
    activeStatePlugin.dropEdges();
    activeStatePlugin.addNodes(id);
    LK.closeTooltip();
    LK.clearSearch();
    LK.locateNode(id, { onComplete: function() {
      LK.openNodeTooltip(sigmaInstance.graph.nodes(id));
    }});
    return false;
  }

  /**
   * Select an edge from the list of search results. It should be called by an event on the item.
   * @returns {boolean}
   */
  function edgeResultHandler() {
    var id = this.dataset.id;
    activeStatePlugin.dropNodes();
    activeStatePlugin.dropEdges();
    activeStatePlugin.addEdges(id);
    LK.closeTooltip();
    LK.clearSearch();
    LK.locateEdge(id, { onComplete: function() {
      LK.openEdgeTooltip(sigmaInstance.graph.edges(id));
    }});
    return false;
  }

  /**
   * Parse the query string and returns an object of parameter<>value.
   * @see http://jsperf.com/querystring-with-javascript
   * @param q
   * @returns {{}}
   */
  function getQueryString (q) {
    return (function(a) {
      if (a == "") return {};
      var b = {};
      for (var i = 0; i < a.length; ++i) {
        var p = a[i].split('=');
        if (p.length != 2) continue;
        b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
      }
      return b;
    })(q.split("&"));
  }

  /**
   * Handle the onDrop event to either load a graph of a design.
   * @param e
   */
  function onDropHandler(e) {
    e.preventDefault();
    e.stopPropagation(); // stop browser from redirecting

    for (var i = 0; i < e.dataTransfer.files.length; i++) {
      var file = e.dataTransfer.files[i];
      var reader = new FileReader(file);

      if (file.name.slice(-4) === 'gexf') {
        reader.onload = function(e) {
          designPlugin.reset();
          var parser = new DOMParser();
          var domElement = parser.parseFromString(e.target.result, "text/xml");
          sigma.parsers.gexf(
            domElement,
            sigmaInstance,
            function() {
              // Fix data:
              sigmaInstance.graph.nodes().forEach(function(node) {
                node.size = node.size || 1;
                node.color = node.color || '#ddd';
              });
              sigmaInstance.refresh();
              locatePlugin.center();
            }
          );
          LK.dom.hide('#drag-overlay');
        };
        reader.readAsText(file);
      }
      else if (file.name.slice(-4) === 'json') {
        reader.onload = function(e) {
          var data = JSON.parse(e.target.result);
          if (data.nodes) {
            // Load graph
            sigmaInstance.graph.clear();
            designPlugin.reset();
            sigmaInstance.graph.read(data);
            sigmaInstance.refresh();
            locatePlugin.center();
          }
          else {
            LK.setDesign(data.styles, data.palette);
          }
          LK.dom.hide('#drag-overlay');
        };
        reader.readAsText(file);
      }
      else {
        console.error('Wrong file type.');
      }
    }
  }

}).call(this);
