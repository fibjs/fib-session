exports.startServer = function (server) {
    if (server.start)
        server.start();
    else if (server.asyncRun)
        server.asyncRun();
}
exports.stopServer = function (server) {
    if (server.stop)
        server.stop();
}