const firebase = require("firebase-admin")
const crypto = require("crypto")
const { getAppCheck } = require("firebase-admin/app-check");

exports.sourceNodes = (
  { actions, createNodeId, createContentDigest },
  { credential, databaseURL, types, quiet = false },
  done
) => {
  const { createNode } = actions
 firebase.initializeApp({
    credential: firebase.credential.cert(credential),
    databaseURL
  })
  getAppCheck()
  const processResultFirebase = ({ result, endpoint, prefix }) => {
    if (result.fields !== result.newFields) {
      Object.defineProperty(result, "newFields",
          Object.getOwnPropertyDescriptor(result, "fields"));
      delete result["fields"];
    }
    const nodeId = createNodeId(`${endpoint}-${result.id}`)
    const nodeContent = JSON.stringify(result)
    const nodeData = Object.assign({}, result, {
      id: nodeId,
      endpointId: result.id,
      parent: null,
      children: [],
      internal: {
        type: `${prefix}${customFormat(endpoint)}`,
        content: nodeContent,
        contentDigest: createContentDigest(result),
      },
    })

    return nodeData
  }

  const db = firebase.database()
  
  db.ref("events").orderByChild('isPublished').equalTo(true).once("value", snapshot => {
    let events = [];
    snapshot.forEach((row) => {
        events.push(row.val())
    });
    events.forEach(result => {
      const nodeData = processResultFirebase({
        result,
        endpoint: "get",
        prefix: "Firebase",
      })
      createNode(nodeData)
    })
    done()
  })
}

//strips special characters and makes string camelcase
const customFormat = str => {
  return str
    .replace(/^.*\/\/[^\/]+/, '') //Removes domain
    .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase()) //Capitalizes strings
    .replace(/\//g, '') //Removes slashes
    .replace(/\-+/g, '') //Removes hyphens
    .replace(/\s+/g, '') //Removes spaces
}
