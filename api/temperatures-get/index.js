module.exports = async function (context, req) {
    const CosmosClient = require("@azure/cosmos").CosmosClient;
    const config = {
        databaseId: "outDatabase",
        containerId: "MyCollection",
        connectiongString: process.env["cosmos_ruuvi_test_DOCUMENTDB"]
      };   

    const { databaseId, containerId, connectiongString } = config;
    const client = new CosmosClient(connectiongString);
    const database = client.database(databaseId);
    const container = database.container(containerId);

    const mac = (req.query.mac || (req.body && req.body.mac));
    const ruuvimacs = process.env["cosmos_ruuvi_macs"];

    const getTemperature = async mac => {
        const querySpec = {
            query: "SELECT * from c WHERE c.mac=@mac ORDER BY c._ts DESC OFFSET 0 LIMIT 1",
            parameters: [{ name: "@mac", value: mac }]
            };
    
            const { resources: items } = await container.items
            .query(querySpec)
            .fetchAll();
        return items;
    }

    if (mac) {
        try {
            const temperature = await getTemperature(mac);
            context.res.status(200).json(temperature);
        } catch (err) {
            context.log(err.message);
            context.res.status(500).send(error);
        }
    } else {
        try {
            var temperatures = [];
            var macs = ruuvimacs.split(",");
            for (let index = 0; index < macs.length; index++) {
                temperatures.push(await getTemperature(macs[index]));
            }
            context.res.status(200).json(temperatures.flat());
        } catch (err) {
            context.log(err.message);
            context.res.status(500).send(error);
        }
    }
};
