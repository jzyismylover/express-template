const { ExpressServer } = require("./server");
const routes = require("./routes");

async function startUp() {
  const server = new ExpressServer();
  for (const route of routes) {
    server.setRoute(route.method, route.path, route.handler);
  }

  server.listen(8080);
}

startUp()