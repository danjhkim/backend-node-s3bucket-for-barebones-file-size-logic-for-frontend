const redis = require('redis');
//Configure redis client
//Memory (single-server, non-replicated persistent storage)
//all session information is stored in memory and is lost when you stop and restart.
//Better to use an external persistence storage.

const redisClient = redis.createClient({
	host: 'localhost',
	port: 6379,
});
redisClient.on('error', function (err) {
	console.log('Could not establish a connection with redis. ' + err);
});
redisClient.on('connect', function (err) {
	console.log('Connected to redis successfully');
});

exports.redisClient = redisClient;
