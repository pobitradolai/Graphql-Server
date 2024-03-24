const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

// GraphQL Schema
const typeDefs = gql`
  type User {
    id: Int
    name: String
    email: String
  }

  type Query {
    users: [User]
    user(id: Int!): User
  }

  type Mutation {
    createUser(name: String!, email: String!): User
    updateUser(id: Int!, name: String, email: String): User
    deleteUser(id: Int!): User
  }
`;

// MySQL Connection
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'graphql',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// GraphQL Resolvers
const resolvers = {
  Query: {
    users: async () => {
      const [rows] = await pool.query('SELECT * FROM users');
      return rows;
    },
    user: async (_, { id }) => {
      const [row] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return row[0];
    }
  },
  Mutation: {
    createUser: async (_, { name, email }) => {
      const [result] = await pool.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
      return { id: result.insertId, name, email };
    },
    updateUser: async (_, { id, name, email }) => {
      await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id]);
      return { id, name, email };
    },
    deleteUser: async (_, { id }) => {
      const [row] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return row[0];
    }
  }
};

async function startApolloServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}${server.graphqlPath}`);
  });
}

startApolloServer().catch(err => console.error(err));
