#! /bin/bash
echo "starting up mongod ... "
mongod --dbpath data &>/dev/null&
echo "starting server ... "
node index.js
