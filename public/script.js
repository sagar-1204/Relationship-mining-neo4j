fetch('/data')
  .then(response => response.json())
  .then(data => {
    createGraph(data);
  })
  .catch(error => console.error('Error fetching data:', error));

function createGraph(data) {
  const nodes = [];
  const edges = [];

 
  data.nodes.forEach(node => {
    let color;
    if (node.type === 'Disorders') {
      color = '#05A3A4'; 
    } else if (node.type === 'Context: Section Title') {
      color = '#FF8C00'; 
    }
    nodes.push({ id: node.node, label: node.node, color: { background: color }, type: node.type, originalColor: color });
  });

 
  data.nodes.forEach(node => {
    if (node.attributesList) {
      node.attributesList.forEach(attribute => {
        const attributeNode = attribute.value;
        const attributeName = attribute.value; 
        let attributeShape = 'dot';
        let attributeSize = 14;
        let attributeColor;

        if (attribute.type === 'Others') {
          attributeColor = '#54f7ec'; 
        } else {
          attributeShape = 'dot';
          attributeSize = 14;
          attributeColor = '#10e61e'; 
        }

        nodes.push({
          id: attributeNode,
          shape: attributeShape,
          label: attributeName,
          size: attributeSize,
          color: { background: attributeColor },
          originalColor: attributeColor,
        });
        edges.push({ from: node.node, to: attributeNode, color: { color: '#84f542' } });
      });
    }
  });

  // Create associations based on the 'associations' array
  data.associations.forEach(association => {
    edges.push({ from: association.sourceNode, to: association.destinationNode });
  });

  // Create Level 1 nodes and their associations based on the 'level1' array
  data.level1.forEach(level1 => {
    const sourceNode = level1.sourceNode;
    const destNode = level1.destNode;
    const level1Node = `Level 1: ${sourceNode} - ${destNode}`;
    const confidenceScore = level1.confidenceScore;
    const concept = level1.concept;
    const str = concept.toString();
    const regex = /-(.*?)\(/;
    const match = str.match(regex);

    nodes.push({
      id: level1Node,
      shape: 'diamond',
      size: 32,
      color: { background: '#E0115F' },
      Score: confidenceScore.toString(),
      label: match[1].trim(),
      font: { multi: 'html' },
      originalColor: '#E0115F',
    });
    edges.push({ from: sourceNode, to: level1Node, color: { color: '#FF1493' } });
    edges.push({ from: level1Node, to: destNode, color: { color: '#FF1493' } });
  });

  // Create the graph
  const container = document.getElementById('graph');
  const graphData = { nodes, edges };
  const options = {
    layout: {
      randomSeed: 2, // Set a random seed for reproducible layouts
    },
    nodes: {
      shape: 'dot',
      size: 30,
      font: {
        size: 18, 
        color: 'black',
        face: 'Verdana',
      },
      margin: 10, 
      borderWidth: 0,
      shadow: {
        enabled: true,
        color: 'rgba(0, 0, 0, 0.8)', 
        x: 9,
        y: 9, 
      },
      shapeProperties: {
        borderDashes: false,
        borderRadius: 10, 
        useImageSize: false,
        useBorderWithImage: false,
      },
    },
    physics: {
      enabled: true,
      stabilization: {
        iterations: 2000, // Increase the number of iterations for better stabilization
      },
      barnesHut: {
        gravitationalConstant: -2000, // Adjust the gravitational constant
        centralGravity: 0.3, // Set the central gravity value
        springLength: 100, // Set the desired spring length
        springConstant: 0.05, // Adjust the spring constant
        damping: 0.09, // Set the damping value
        avoidOverlap: 0.5, // Adjust the overlap avoidance factor
      },
    },
    interaction: {
      hover: true,
      dragView: true, // Updated option for dragView
      zoomView: true, // Added option for zoomView
    },
    edges: {
      color: '#888', 
      width: 2.1,
      smooth: false,
      arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      
    },
  };

  const network = new vis.Network(container, graphData, options);

  // Click event handler
  network.on('click', params => {
    const clickedNodeId = params.nodes[0];

    // Check if a node was clicked
    if (clickedNodeId) {
      const clickedNode = nodes.find(node => node.id === clickedNodeId);

      // Highlight clicked node and its attributes
      clickedNode.color = { background: '#800080' };
      clickedNode.font = { color: 'black', size: 24, face: 'Tahoma', multi: 'html' };

      const connectedNodes = network.getConnectedNodes(clickedNodeId);
      const attributeNodes = connectedNodes.filter(nodeId =>
        nodes.find(node => node.id === nodeId && node.shape === 'dot')
      );

      // Dim other nodes and their attributes
      nodes.forEach(node => {
        if (attributeNodes.includes(node.id) || node.id === clickedNodeId) {
          node.color = { background: '#800080' }; // Set color for highlighted nodes
          node.font = { color: 'black', size: 24, face: 'Tahoma', multi: 'html' };
        } else {
          node.color = { background: '#D3D3D3' }; // Set color for dimmed nodes
          node.font = { color: 'black', size: 12, face: 'Tahoma' };
        }
      });

      // Dim edges connected to other nodes
      edges.forEach(edge => {
        if (!attributeNodes.includes(edge.from) && !attributeNodes.includes(edge.to)) {
          edge.color = { color: '#D3D3D3' };
        }
      });
    } else {
      // No node was clicked, restore original colors
      nodes.forEach(node => {
        const originalColor = node.originalColor || '#97C2FC';
        const originalFont = node.originalFont || { color: 'black', size: 18, face: 'Tahoma' };
        node.color = { background: originalColor };
        node.font = originalFont;
      });

      // Reset edge colors
      edges.forEach(edge => {
        edge.color = { color: '#888' };
      });
    }

    network.setData({ nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) });
    network.redraw();
  });

  const contextBtn = document.getElementById('context-btn');
  const blueBtn = document.getElementsByClassName('legend-blue')[0];
  const pinkBtn = document.getElementsByClassName('legend-pink')[0];

  // Store the original colors of the nodes
  const nodeOriginalColors = nodes.map(node => ({
    id: node.id,
    color: node.color,
    font: node.font
  }));

  // Add event listeners to the legend buttons
  contextBtn.addEventListener('click', () => highlightNodeByType('Context: Section Title'));
  blueBtn.addEventListener('click', () => highlightNodeByType('Disorders'));
  pinkBtn.addEventListener('click', () => highlightNodesByShape('diamond'));

  function highlightNodeByType(type) {
    nodes.forEach(node => {
      const originalColor = nodeOriginalColors.find(n => n.id === node.id);

      if (node.type === type) {
        node.color = originalColor.color;
        node.font = originalColor.font;
      } else {
        node.color = { background: '#D3D3D3' };
        node.font = { color: 'black', size: 12, face: 'Tahoma' };
      }
    });

    updateGraphData();
  }

  function highlightNodesByShape(shape) {
    nodes.forEach(node => {
      const originalColor = nodeOriginalColors.find(n => n.id === node.id);

      if (node.shape === shape) {
        node.color = originalColor.color;
        node.font = originalColor.font;
      } else {
        node.color = { background: '#D3D3D3' };
        node.font = { color: 'black', size: 12, face: 'Tahoma' };
      }
    });

    updateGraphData();
  }

  function updateGraphData() {
    network.setData({ nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) });
    network.redraw();
  }

  // Zoom buttons
  const zoomInBtn = document.getElementById('zoom-in-btn');
  const zoomOutBtn = document.getElementById('zoom-out-btn');

const upperLimit = 2.0; 
const lowerLimit = 0.5;

  // Event listeners for zoom in and zoom out buttons
zoomInBtn.addEventListener('click', () => {
  const scale = network.getScale();
  if (scale < upperLimit) {
    network.moveTo({ scale: scale + 0.1 });
  }
});

zoomOutBtn.addEventListener('click', () => {
  const scale = network.getScale();
  if (scale > lowerLimit) {
    network.moveTo({ scale: scale - 0.1 });
  }
});

  // Add an event listener to the search bar
  const searchBar = document.getElementById('search-bar');
  if (searchBar) {
    searchBar.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        const searchInput = searchBar.value.toLowerCase();

        if (searchInput === 'nodes') {
          highlightNodesByType();
        } else if (searchInput === 'attributes') {
          highlightNodesBySize(14);
        } else if (searchInput === 'level 1') {
          highlightNodesByShape('diamond');
        } else {
          resetHighlighting();
        }
      }
    });
  } else {
    console.error("Search bar element not found.");
  }

function highlightNodesByType() {
  nodes.forEach(node => {
    const originalColor = nodeOriginalColors.find(n => n.id === node.id);
    

    if (node.type ==="Context: Section Title"|| node.type ==="Disorders") {
      node.color = originalColor.color;
      node.font = originalColor.font;
    } else {
      node.color = { background: '#D3D3D3' };
      node.font = { color: 'black', size: 12, face: 'Tahoma' };
    }
  });

  updateGraphData();
}
function highlightNodesBySize(size) {
  nodes.forEach(node => {
    const originalColor = nodeOriginalColors.find(n => n.id === node.id);
   

    if (node.size ===size) {
      node.color = originalColor.color;
      node.font = originalColor.font;
    } else {
      node.color = { background: '#D3D3D3' };
      node.font = { color: 'black', size: 12, face: 'Tahoma' };
    }
  });

  updateGraphData();
}
function highlightNodesByShape(shape) {
  nodes.forEach(node => {
    const originalColor = nodeOriginalColors.find(n => n.id === node.id);

    if (node.shape === shape) {
      node.color = originalColor.color;
      node.font = originalColor.font;
    } else {
      node.color = { background: '#D3D3D3' };
      node.font = { color: 'black', size: 12, face: 'Tahoma' };
    }
  });

  updateGraphData();
}

function resetHighlighting() {
  nodes.forEach(node => {
    const originalColor = nodeOriginalColors.find(n => n.id === node.id);
    node.color = originalColor.color;
    node.font = originalColor.font;
  });

  updateGraphData();
}

  
}
