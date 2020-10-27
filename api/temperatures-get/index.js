module.exports = async function (context, req) {
    const CosmosClient = require("@azure/cosmos").CosmosClient;
    const config = {
        databaseId: "outDatabase",
        containerId: "MyCollection",
        connectiongString: process.env["cosmos-ruuvi-test_DOCUMENTDB"]
      };   

    const { databaseId, containerId, connectiongString } = config;
    const client = new CosmosClient(connectiongString);
    const database = client.database(databaseId);
    const container = database.container(containerId);

    const mac = (req.query.mac || (req.body && req.body.mac));

    if (mac) {
        try {
            const querySpec = {
            query: "SELECT * from c WHERE c.mac=@mac ORDER BY c._ts DESC OFFSET 0 LIMIT 1",
            parameters: [{ name: "@mac", value: mac }]
            };

            const { resources: items } = await container.items
            .query(querySpec)
            .fetchAll();

            context.res.status(200).json(items);
        } catch (err) {
            console.log(err.message);
            context.res.status(500).send(error);
        }
    } else {
        try {
            const querySpec = {
            query: "SELECT * from c WHERE c.mac=@mac ORDER BY c._ts DESC OFFSET 0 LIMIT 1",
            parameters: [{ name: "@mac", value: "f39a99eac7c2" }]
            };

            const { resources: items } = await container.items
            .query(querySpec)
            .fetchAll();

            const querySpec2 = {
            query: "SELECT * from c WHERE c.mac=@mac ORDER BY c._ts DESC OFFSET 0 LIMIT 1",
            parameters: [{ name: "@mac", value: "cdf431cfc39d" }]
            };

            const { resources: items2 } = await container.items
            .query(querySpec2)
            .fetchAll();

            context.res.status(200).json(items.concat(items2));
        } catch (err) {
            console.log(err.message);
            context.res.status(500).send(error);
        }
    }
};