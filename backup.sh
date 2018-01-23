#! /usr/bin/env bash
DATE=`date +%Y-%m-%d`
mongodb
cd dump
git commit -am $DATE
git push
cd ..
