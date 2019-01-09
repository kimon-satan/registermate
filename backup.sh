#! /usr/bin/env bash
DATE=`date +%Y-%m-%d`
cd /home/skata001/registermate_v3.0
mongodump
cd dump
git commit -am $DATE
git push
cd ..
