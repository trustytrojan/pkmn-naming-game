import process from 'node:process';

const pokemonSet = new Set(
	Deno.readTextFileSync('pokemon.txt')
		.split('\n')
		.map((p) => p.trim().toLowerCase())
		.filter((p) => p),
);
const guessedSet = new Set<string>();

const totalPokemon = pokemonSet.size;
console.log(`read in ${totalPokemon} pokemon`);

Deno.serve((req, info) => {
	const addr = `${info.remoteAddr.hostname}:${info.remoteAddr.port}`;
	console.log(`[http ${addr} ${req.method} ${req.url}]`);

	if (req.headers.get('upgrade') === 'websocket') {
		const { socket, response } = Deno.upgradeWebSocket(req);

		socket.onopen = () => console.log(`[ws ${addr} OPENED]`);

		socket.onmessage = ({ data: msg }) => {
			if (typeof msg !== 'string') {
				console.log(`[ws ${addr} MESSAGE] data is not a string! closing socket!`);
				socket.close();
				return;
			}

			msg = msg.trim();
			console.log(`[ws ${addr} MESSAGE] '${msg}'`);
			msg = msg.toLowerCase();

			if (pokemonSet.has(msg)) {
				pokemonSet.delete(msg);
				guessedSet.add(msg);
				console.log(`[pkmn ${addr}] guessed '${msg}'!`);
				socket.send(`correct! ${guessedSet.size}/${totalPokemon} guessed`);
				return;
			}

			if (guessedSet.has(msg)) {
				console.log(`[pkmn ${addr}] already guessed ${msg}!`);
				socket.send(`already guessed!`);
				return;
			}
		};

		socket.onerror = (ev) => {
			process.stderr.write(`[ws ${addr} ERROR] `);
			if (ev instanceof ErrorEvent) {
				console.error(ev.message);
			} else {
				console.error(ev.type);
			}
		};

		socket.onclose = (ev) =>
			console.log(`[ws ${addr} CLOSED] code=${ev.code} reason='${ev.reason}' wasClean=${ev.wasClean}`);

		return response;
	} else {
		return new Response(Deno.readTextFileSync('index.html'), { headers: { 'Content-Type': 'text/html' } });
	}
});
