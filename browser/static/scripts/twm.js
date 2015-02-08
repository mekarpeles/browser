
var Workspace = function(options) {
  jQuery.extend(true, this, {
    workspaceSlotCls: 'slot',
    focusedSlot: null,
    slots: [],
    windows: [],
    appendTo: null,
    parent: 'body',
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
  },

  calculateLayout: function() {
    var _this = this,
    layout;

    _this.layout = layout = new Isfahan({
      containerId: _this.element.attr('id'),
      layoutDescription: _this.layoutDescription,
      configuration: null,
      padding: 0
    });
    
    var data = layout.filter( function(d) {
      return !d.children;
    });

    // Data Join.
    var divs = d3.select("#" + _this.element.attr('id')).selectAll(".layout-slot")
      .data(data, function(d) { return d.id; });

    // Implicitly updates the existing elements.
    // Must come before the enter function.
    divs.call(cell);

    // Enter
    divs.enter().append("div")
      .attr("class", "layout-slot")
      .attr("data-layout-slot-id", function(d) { return d.id; })
      .call(cell)
      .each(function(d) {
	_this.set("focusedSlot", d.id);
      });

    // Exit
    divs.exit()
      .remove("div")
      .each(function(d) { 
      });

    function cell() {
      this
        .style("left", function(d) { return d.x + "px"; })
        .style("top", function(d) { return d.y + "px"; })
        .style("width", function(d) { return Math.max(0, d.dx ) + "px"; })
        .style("height", function(d) { return Math.max(0, d.dy ) + "px"; });
    }

    var root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];
  },

  split: function(slotid, direction) {
    var _this = this
    var node = jQuery.grep(_this.layout, function(node) {
      return node.id === slotid;
    })[0];
    nodeIndex = node.parent ? node.parent.children.indexOf(node) : 0;

    function addSibling(node, indexDifference) {
      var siblingIndex = nodeIndex + indexDifference,
      newSibling = _this.newNode(node.type, node.address.concat("." + node.type + (siblingIndex + 1)), node);

      node.parent.children.splice(siblingIndex, 0, newSibling);
      _this.layout.push(newSibling);

      return newSibling;
    }

    function mutateAndAdd(node, indexDifference) {
      var newParent = _this.newNode(node.type, node.address, node.parent),
      oldAddress = node.address,
      nodeIsNotRoot = node.parent;

      // Recalculate the address of this node
      // and flip its type while keeping
      // the same id.
      node.type = node.type === 'row' ? 'column' : 'row';
      node.address = node.address.concat('.' + node.type + '1');

      // Create a new node (which will be childless)
      // that is also a sibling of this node.
      newSibling = _this.newNode(node.type, oldAddress.concat("." + node.type + '1'), newParent);

      // maintain array ordering.
      newParent.children = [];
      newParent.children.push(node); // order matters.
      newParent.children.splice(indexDifference, 0, newSibling); // order matters.
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

  splitRight: function(targetSlot) {
    var _this = this;
    _this.split(targetSlot, 'r');
  },

  splitLeft: function(targetSlot) {
    var _this = this;
    _this.split(targetSlot, 'l');
  },

  splitUp: function(targetSlot) {
    var _this = this;
    _this.split(targetSlot, 'u');
  },

  splitDown: function(targetSlot) {
    var _this = this;
    _this.split(targetSlot, 'd');
  },

  removeNode: function(targetSlot) {
    // De-mutate the tree structure.
    var _this = this,
    node = jQuery.grep(_this.layout, function(node) { return node.id === targetSlot.slotID; })[0],
    nodeIndex = node.parent.children.indexOf(node),
    parentIndex,
    remainingNode,
    root = jQuery.grep(_this.layout, function(node) { return !node.parent;})[0];

    if (node.parent.children.length === 2) {
      node.parent.children.splice(nodeIndex,1);
      remainingNode = node.parent.children[0];

      remainingNode.parent.id = remainingNode.id;
      delete remainingNode.parent.children;
    } else { 
      // If the node is one of more than 2 siblings,
      // simply splice it out of the parent's children 
      // array.
      node.parent.children.splice(nodeIndex, 1);
    }

    _this.layoutDescription = root;
    _this.calculateLayout();
  },

  newNode: function(type, address, parent) {
    return {
      type: type,
      address: address,
      id: $.genUUID(),
      parent: parent
    };
  },
  
  // mousetrap funcs 
  bindEvents: function() {
    var _this = this;
    d3.select(window).on('resize', function(event) {
      //_this.calculateLayout();
    });
  },
};

var app = {
  container: $("#canvas"),
  q0: {type: "row"}, // start state
  workspace: 0,
  workspaces: []
};
app.workspaces.push(new Workspace({
  workspaceSlotCls: 'slot',
  focusedSlot: null,
  slots: [],
  windows: [],
  parent: $("body"),
  appendTo: app.container,
  layoutDescription: app.q0
}));

Mousetrap.bindGlobal(['meta+x', 'alt+x'], function(e) {
  $('#omnibox').select();
});

Mousetrap.bindGlobal(['meta+w', 'alt+w'], function(e) {
  
})

//
Mousetrap.bindGlobal(['meta+s', 'alt+s'], function(e) {
  alert('splitting');
  var ws = app.workspaces[app.workspace];
  ws.splitRight(ws.focusedSlot);
})

