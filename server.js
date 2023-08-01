const express = require('express');
const neo4j = require('neo4j-driver');
const cors = require('cors');
const path = require('path');
const app = express();

// Create a Neo4j driver instance
const driver = neo4j.driver(
  'neo4j+s://cfb3c6c1.databases.neo4j.io:7687',
  neo4j.auth.basic('neo4j', 'sR4zG6UdL2OsNo_ZNcD7xYX9Z2DIkNEFLcEBycA_12U')
);
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Define a route to handle the request
app.get('/data', (req, res) => {
  const session = driver.session();

  // Define the Cypher query to retrieve the graph structure dynamically
  const cypherQuery = `
    MATCH (n)-[r]->(m)
    RETURN labels(n) AS sourceLabels, properties(n) AS sourceProperties, labels(m) AS targetLabels, properties(m) AS targetProperties, type(r) AS relationshipType, properties(r) AS relationshipProperties
  `;

  session
    .run(cypherQuery)
    .then(result => {
      const graphData = [];
      
      const records = result.records;
      records.forEach(record => {
        const sourceLabels = record.get('sourceLabels');
        const sourceProperties = record.get('sourceProperties');
        const targetLabels = record.get('targetLabels');
        const targetProperties = record.get('targetProperties');
        const relationshipType = record.get('relationshipType');
        const relationshipProperties = record.get('relationshipProperties');

        // Process source node
        const sourceNode = {
          node: sourceProperties.name,
          type: sourceLabels[0],
          attributesList: [],
          attributes: [],
        };
        Object.keys(sourceProperties).forEach(key => {
          if (key !== 'name') {
            sourceNode.attributesList.push({
              type: key,
              value: sourceProperties[key],
            });
            sourceNode.attributes.push(sourceProperties[key]);
          }
        });

        // Process target node
        const targetNode = {
          node: targetProperties.name,
          type: targetLabels[0],
          attributesList: [],
          attributes: [],
        };
        Object.keys(targetProperties).forEach(key => {
          if (key !== 'name') {
            targetNode.attributesList.push({
              type: key,
              value: targetProperties[key],
            });
            targetNode.attributes.push(targetProperties[key]);
          }
        });

        // Process association
        const association = {
          sourceNode: sourceProperties.name,
          destinationNode: targetProperties.name,
          edge: relationshipType,
          attributesList: relationshipProperties,
          attributes: Object.values(relationshipProperties),
        };
        
        // Generate array name dynamically
        const graphIndex = graphData.length + 1;
        const arrayName = `array${graphIndex}`;

        if (!graphData[arrayName]) {
          graphData[arrayName] = {
            nodes: [],
            associations: [],
            level1: [],
          };
        }

        graphData[arrayName].nodes.push(sourceNode, targetNode);
        graphData[arrayName].associations.push(association);
      });

      const response = {
        graphData,
      };

      res.json(response);
    })
    .catch(error => {
      console.error('Error executing Cypher query:', error);
      res.status(500).json({ error: 'An error occurred while executing the query' });
    })
    .finally(() => {
      session.close();
    });
});

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
  console.log('http://localhost:3000');
});
