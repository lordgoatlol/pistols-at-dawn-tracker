// pages/index.js
import { useState } from 'react';
import { PieChart, Pie, Legend, Cell } from 'recharts';

// The GraphQL endpoint for the Pistols at Dawn world (Starknet mainnet Torii API)
const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_TORII_GRAPHQL_URL 
    || 'https://api.cartridge.gg/x/pistols-mainnet-2/torii/graphql';

/*
 * GraphQL query to fetch all duels involving a given player (by address).
 * The actual schema may vary; adjust fields as needed.
 */
const DUELS_QUERY = `
  query DuelsByPlayer($player: Bytes!) {
    # Assuming the schema has an allDuels or duels query that can be filtered by player address:
    allDuels(filter: { participants: { contains: $player } }) {
      id
      player1 { address, username }
      player2 { address, username }
      shotStepsP1
      shotStepsP2
      dodgeStepsP1
      dodgeStepsP2
      winner  # which player address won
    }
  }
`;

export default function HomePage() {
  const [player, setPlayer] = useState('');
  const [duels, setDuels] = useState([]);
  const [error, setError] = useState(null);

  const searchDuels = async () => {
    setError(null);
    try {
      // Fetch duels from the GraphQL API
      const res = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: DUELS_QUERY,
          variables: { player: player }  // player should be the Starknet address (hex string)
        }),
      });
      const json = await res.json();
      if (json.errors) {
        console.error(json.errors);
        setError("GraphQL error: " + JSON.stringify(json.errors));
      } else {
        // Assume the response contains data.allDuels array
        setDuels(json.data.allDuels);
      }
    } catch (e) {
      console.error(e);
      setError("Request failed: " + e.message);
    }
  };

  // Prepare data for a win/loss pie chart
  const wins = duels.filter(d => d.winner?.toLowerCase() === player.toLowerCase()).length;
  const losses = duels.length - wins;
  const chartData = [
    { name: 'Wins', value: wins },
    { name: 'Losses', value: losses },
  ];
  const COLORS = ['#0088FE', '#FF8042'];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '2rem' }}>
      <h1>Pistols at Dawn – Player Duel History</h1>
      <p>Enter a player’s Starknet address or username to see their past duels:</p>
      <input 
        type="text" 
        placeholder="Player address (hex)" 
        value={player} 
        onChange={e => setPlayer(e.target.value)} 
        style={{ width: '400px', marginRight: '8px' }}
      />
      <button onClick={searchDuels}>Search</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {duels.length > 0 && (
        <>
          <h2>{duels.length} duels found</h2>
          {/* Summary Pie Chart */}
          <div style={{ width: 300, margin: '1rem 0' }}>
            <PieChart width={300} height={250}>
              <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </div>

          {/* Duel details table */}
          <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#eee' }}>
                <th>Duel ID</th>
                <th>Opponent</th>
                <th>Your Shots</th>
                <th>Your Dodges</th>
                <th>Opponent Shots</th>
                <th>Opponent Dodges</th>
                <th>Winner</th>
              </tr>
            </thead>
            <tbody>
              {duels.map(duel => {
                const isPlayer1 = duel.player1.address.toLowerCase() === player.toLowerCase();
                const yourShots = isPlayer1 ? duel.shotStepsP1 : duel.shotStepsP2;
                const yourDodges = isPlayer1 ? duel.dodgeStepsP1 : duel.dodgeStepsP2;
                const oppShots  = isPlayer1 ? duel.shotStepsP2 : duel.shotStepsP1;
                const oppDodges = isPlayer1 ? duel.dodgeStepsP2 : duel.dodgeStepsP1;
                const opponent  = isPlayer1 ? duel.player2.username || duel.player2.address
                                            : duel.player1.username || duel.player1.address;
                const winner = duel.winner && (duel.winner.toLowerCase() === player.toLowerCase()
                                  ? 'You' : 'Opponent');
                return (
                  <tr key={duel.id}>
                    <td>{duel.id}</td>
                    <td>{opponent}</td>
                    <td>{yourShots.join(', ')}</td>
                    <td>{yourDodges.join(', ')}</td>
                    <td>{oppShots.join(', ')}</td>
                    <td>{oppDodges.join(', ')}</td>
                    <td>{winner}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
