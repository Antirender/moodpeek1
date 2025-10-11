// server/devSeed.js
const mongoose = require('mongoose');
const Entry = require('./models/Entry');

async function seedEntries(){
  const moods=['happy','calm','neutral','sad','stressed'];
  const cities=['Oakville','Toronto','Nanjing'];
  const today=new Date();
  const docs=[];
  
  for(let i=0;i<120;i++){
    const d=new Date(); 
    d.setDate(today.getDate()-i);
    const temp = Math.round(d.getMonth()<2? (Math.random()*10-5) : 15 + Math.random()*15);
    const hum = Math.round(40+Math.random()*50);
    const mood = moods[Math.floor(Math.random()*moods.length)];
    
    docs.push({
      date:d, 
      mood, 
      city:cities[Math.floor(Math.random()*cities.length)],
      tags: (Math.random()>0.5?['work','gym','study','social'].filter(()=>Math.random()>0.6):[]),
      note:'seed', 
      weather:{tempC:temp, humidity:hum, condition:'seed'}
    });
  }
  
  // Delete existing entries with note = 'seed'
  await Entry.deleteMany({ note: 'seed' });
  
  // Insert new seed data
  await Entry.insertMany(docs);
  console.log(`Inserted ${docs.length} seed entries`);
}

module.exports = { seedEntries };