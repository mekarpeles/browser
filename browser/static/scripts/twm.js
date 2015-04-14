// This is a physical Slot/Window of the Workspace
var Window = function(options) {
  return {
    buffer: null, // pointer to a content buffer
    slotID: options.slotID,
    appendTo: options.appendTo,
  }
};
Window.prototype = {
  setBuffer: function(buffer) {
    this.buffer = buffer;
  }
}

var Browser = function(){
  workspace: null
};
Browser.prototype = {
  // Workspace Interface method implemented by Browser as a callback
  // to addNode
  addWindow: function(d, parent, workspace) {
    var $container = jQuery(parent);
    $('.layout-slot').removeClass('selected');
    $container.addClass('selected');
    var w = new Window({
      slotID: d.id,
      appendTo: parent
    });

    // Add to the Windows managed by browser
    workspace.windows.push(w)
    workspace.selected = w;
  },

  // Workspace Interface method implemented by Browser as a callback
  // to removeNode
  rmWindow: function(d, container) {
    var $vp = jQuery(container);
    $('.layout-slot').removeClass('selected');

    // d.id is the id of the window.
    // we can fetch the window and call
    // this.workspace.remove(window)
    this.workspace;
    
    // this.windows[this.mutexes.ws] = this.windows[Object.keys(this.windows)[0]];

    // get window
    // add to this.workspace.selected
    $vp.addClass('selected');
  }
}

Workspace = function(options) {
  jQuery.extend(true, this, {    
    selected: null, // a window

    windows: [],

    parent: null,
    appendTo: null,  
    layoutDescription: null    
  }, options);

  this.element  = this.element || jQuery('<div class="workspace-container" id="workspace">');
  this.init();
};

Workspace.prototype = {

  init: function () {
    this.element.appendTo(this.appendTo);
    this.calculateLayout();
    this.bindEvents();
  },

  get: function(prop, parent) {
    if (parent) {
      return this[parent][prop];
    }
    return this[prop];
  },

  set: function(prop, value, options) {
    var _this = this;
    if (options) {
      this[options.parent][prop] = value;
    } else {
      this[prop] = value;
    }
    //jQuery.publish(prop + '.set', value);
  },

  // Defines Node data structure on workspace
  Node: function() {
    var ws = this;
    var Node = function(type, parent) {
      this.ws = ws;
      this.type = type;
      this.id = this.uuid();
      
      if (parent) { this.parent = parent; }
    }
    Node.prototype = {
      uuid: function() {
	'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	  var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	  return v.toString(16);
	});
      },
    }
    return Node;
  }(),

  calculateLayout: function() {
    var _this = this;

    _this.layout = new Isfahan({
      containerId: _this.element.attr('id'),
      layoutDescription: _this.layoutDescription,
      configuration: null,
      padding: 0
    });

    var data = _this.layout.filter( function(d) {
      return !d.children;
    });

    // Data Join.
    var divs = d3.select("#" + _this.element.attr('id')).selectAll(".layout-slot")
      .data(data, function(d) { return d.id; });

    // Implicitly updates the existing elements.
    // Must come before the enter function.
    divs.call(cell).each(function(d) {
    });

    // Enter
    divs.enter().append("div")
      .attr("class", "layout-slot")
      .attr("data-layout-slot-id", function(d) { return d.id; })
      .call(cell)
      .each(function(d) {
	var appendTo = _this.element.children('div')
	  .filter('[data-layout-slot-id="' + d.id + '"]')[0];
	_this.parent.addWindow(d, appendTo, _this);
      });

    // Exit
    divs.exit()
      .remove("div")
      .each(function(d) {
	var siblings = _this.element.siblings('div')
	  .filter('[data-layout-slot-id="' + d.id + '"]');
	var parents = _this.element.parent('div')
	  .filter('[data-layout-slot-id="' + d.id + '"]');	
	var container = siblings.length ? siblings[0] : parents[0];
	_this.parent.rmWindow(d, container);
      });

    function cell() {
      this
	.style("left", function(d) { return d.x + "px"; })
	.style("top", function(d) { return d.y + "px"; })
	.style("width", function(d) { return Math.max(0, d.dx ) + "px"; })
	.style("height", function(d) { return Math.max(0, d.dy ) + "px"; });
    }

    var root = jQuery.grep(
      _this.layout, function(node) {
	return !node.parent;
      })[0];
  },

  /*
    Changes focus to the specified targetSlot or, the slot to the
    `direction` ∈ ['l' | 'u' | 'r' | 'd'] of targetSlot.
   */
  select: function(targetSlot, direction) {
    if (!direction) {
      console.log('select');
    }
  },

  split: function(targetSlot, direction) {
    var _this = this,
    node = jQuery.grep(
      _this.layout, function(node) {
	return node.id === targetSlot.slotID;
      })[0];
    nodeIndex = node.parent ? node.parent.children.indexOf(node) : 0,
    nodeIsNotRoot = node.parent;

    function addSibling(node, indexDifference) {
      if (nodeIsNotRoot) {
	var siblingIndex = nodeIndex + indexDifference,
	newSibling = new _this.Node(node.type, node);

	node.parent.children.splice(siblingIndex, 0, newSibling);
	_this.layout.push(newSibling);
	return newSibling;
      }

      // handles the case where the root needs to be mutated.
      node.type = node.type === 'row' ? 'column' : 'row';
      mutateAndAdd(node, indexDifference);
    }

    function mutateAndAdd(node, indexDifference) {
      // Locally mutate the tree to accomodate a 
      // sibling of another kind, transforming
      // both the target node and its parent.
      var newParent = new _this.Node(node.type, node.parent);

      // Flip its type while keeping
      // the same id.
      node.type = node.type === 'row' ? 'column' : 'row';

      // Create a new node (which will be childless)
      // that is also a sibling of this node.
      newSibling = new _this.Node(node.type, newParent);

      // maintain array ordering.
      newParent.children = [];
      newParent.children.push(node); // order matters, place node first.
      // order matters, so put new sibling on one side or the other.
      newParent.children.splice(indexDifference, 0, newSibling); 
      if (nodeIsNotRoot) {
	newParent.parent = node.parent;
	// replace the old node in its parent's child
	// array with the new parent.
	newParent.parent.children[nodeIndex] = newParent;
      }

      node.parent = newParent;
      _this.layout.push(newParent, newSibling);
    }

    if (node.type === 'column') {
      // Since it is a column:
      // 
      // If adding to a side, simply
      // add a sibling.
      // Left means before, right means after.
      if (direction === 'r' || direction === 'l') {
	indexDifference = direction === 'r' ? 1 : 0;
	addSibling(node, indexDifference);
      } 
      // If adding above or below, the
      // operation must be changed to mutating
      // the structure. 
      // Up means before, Down means after.
      else {
	indexDifference = direction === 'd' ? 1 : 0;
	mutateAndAdd(node, indexDifference);
      }
    } else {
      // Since it is a row:
      //
      // If adding to a side, mutate the 
      // structure.
      // Left means before, right means after.
      if (direction === 'r' || direction === 'l') {
	indexDifference = direction === 'r' ? 1 : 0;
	mutateAndAdd(node, indexDifference);
      } 
      // If adding above or below, the
      // operations must be switched to adding
      // a sibling. 
      // Up means before, Down means after.
      else {
	indexDifference = direction === 'd' ? 1 : 0;
	addSibling(node, indexDifference);
      }
    }

    // Recalculate the layout.
    // The original hierarchical structure is
    // accessible from the root node. Passing 
    // it back through the layout code will 
    // recalculate everything else needed for 
    // the redraw.
    var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
    _this.layoutDescription = root;
    _this.calculateLayout();

  },

  removeNode: function(targetSlot) {
    // de-mutate the tree structure.
    var _this = this,
    node = jQuery.grep(_this.layout, function(node) {
      return node.id === targetSlot.slotID;
    })[0],
    nodeIndex = node.parent.children.indexOf(node),
    parentIndex,
    remainingNode,
    root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];

    if (node.parent.children.length === 2) {
      // de-mutate the tree without destroying
      // the children of the remaining node, 
      // which in this case means changing their
      // IDs.
      node.parent.children.splice(nodeIndex,1);
      remainingNode = node.parent.children[0];
      remainingNode.parent.id = remainingNode.id;
      delete node.parent;
    } else if (node.parent.children.length === 1) { 
    } else { 
      // If the node is one of more than 2 siblings,
      // simply splice it out of the parent's children 
      // array.
      node.parent.children.splice(nodeIndex, 1);
    }

    _this.layoutDescription = root;
    _this.calculateLayout();
  },

  bindEvents: function() {
    var _this = this;
    d3.select(window).on('resize', function(event) {
      _this.calculateLayout();
    });
  }
};

var browser = new Browser();
browser.workspace = new Workspace({
  parent: browser,
  appendTo: jQuery('#canvas'),
  layoutDescription: {type: "row"}
});

function keybindings() {
  var keys = {
    'h': 'l',
    'j': 'u',
    'k': 'd',
    'l': 'r'
  };
  Object.keys(keys).forEach(function(key) {
    Mousetrap.bindGlobal(['meta+' + key, 'alt+' + key], function(e) {
      var ws = browser.workspace;
      console.log(key, keys[key]);
      ws.split(ws.selected, keys[key]);
    });
    Mousetrap.bindGlobal(['command+' + key, 'ctrl+' + key], function(e) {
      var ws = browser.workspace;
      ws.select(ws.selected,  keys[key]);
    });
  })

  Mousetrap.bindGlobal(['meta+r', 'alt+r'], function(e) {
    var ws = browser.workspace;
    ws.removeNode(ws.selected);
  });

  Mousetrap.bindGlobal(['meta+x', 'alt+x'], function(e) {
    $('#omnibox').select();
  });
}();