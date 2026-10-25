const { app } = require("@azure/functions");
const { CosmosClient } = require("@azure/cosmos");

const config = {
    databaseId: "measurementdb",
    containerId: "measurementdata"
};

// Created on first request so a missing connection string doesn't stop the app from loading
let container;
const getContainer = () => {
    if (!container) {
        const client = new CosmosClient(process.env["COSMOSDB_CONNECTION_STRING"]);
        container = client.database(config.databaseId).container(config.containerId);
    }
    return container;
};

const getTemperature = async mac => {
    const querySpec = {
        query: "SELECT c.eventDate, c.mac, c.location, c.temperature, c.humidity, c.pressure, c.battery from c WHERE c.mac=@mac ORDER BY c._ts DESC OFFSET 0 LIMIT 1",
        parameters: [{ name: "@mac", value: mac }]
    };

    const { resources: items } = await getContainer().items
        .query(querySpec)
        .fetchAll();
    return items;
};

const getMacFromBody = async request => {
    try {
        const body = await request.json();
        return body && body.mac;
    } catch {
        return undefined;
    }
};

app.http("temperatures-get", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    route: "temperatures",
    handler: async (request, context) => {
        const mac = request.query.get("mac") || (request.method === "POST" && await getMacFromBody(request));

        try {
            if (mac) {
                return { status: 200, jsonBody: await getTemperature(mac) };
            }

            const macs = process.env["cosmos_ruuvi_macs"].split(",");
            const temperatures = [];
            for (const m of macs) {
                temperatures.push(await getTemperature(m.trim()));
            }
            return { status: 200, jsonBody: temperatures.flat() };
        } catch (err) {
            context.error(err.message);
            return { status: 500, body: "Failed to read temperatures" };
        }
    }
});
