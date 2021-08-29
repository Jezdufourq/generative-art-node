const fs = require("fs");
const myArgs = process.argv.slice(2);
const { createCanvas, loadImage } = require("canvas");
const { layers, width, height } = require("./input/config.js");
const console = require("console");
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
const edition = myArgs.length > 0 ? Number(myArgs[0]) : 1;
var metadata = [];
var attributes = [];
var hash = [];
var decodedHash = [];

const cachedRarity = new Map();

const saveLayer = (_canvas, _edition) => {
  fs.writeFileSync(`./output/${_edition}.png`, _canvas.toBuffer("image/png"));
};

const addMetadata = (_edition) => {
  let dateTime = Date.now();
  let tempMetadata = {
    hash: hash.join(""),
    decodedHash: decodedHash,
    edition: _edition,
    date: dateTime,
    attributes: attributes,
  };
  metadata.push(tempMetadata);
  attributes = [];
  hash = [];
  decodedHash = [];
};

const addAttributes = (_element, _layer) => {
  let tempAttr = {
    id: _element.id,
    layer: _layer.name,
    name: _element.name,
    rarity: _element.rarity,
    rarityPercent: _element.rarityPercent,
  };
  attributes.push(tempAttr);
  hash.push(_layer.id);
  hash.push(_element.id);
  decodedHash.push({ [_layer.id]: _element.id });
};

const drawLayer = async (_layer, _edition) => {
  // This gets a random asset for the specific layer
  // We also need to check here to make sure that the asset that is selected accounts for
  // the rarity of the asset

  // for example, an asset with a staff with 5% rarity means that out of all assets of 100, only
  // 5 of the final nfts created can have that staff

  // Therefore we need to track the created layers and assets, compare the random generated one with
  // the current status, and if there is still capacity create it, if there isnt, search again

  // There might be performance issues here, but lets give this one a quick shot
  // TODO: check for rarity
  let elementIdx = Math.floor(Math.random() * _layer.elements.length);
  while(cachedRarity.get(`${_layer.id}${elementIdx}`) == 0){
    elementIdx = Math.floor(Math.random() * _layer.elements.length);
    console.log(elementIdx);
  }
  // decrement cache
  cachedRarity.set(`${_layer.id}${elementIdx}`,cachedRarity.get(`${_layer.id}${elementIdx}`)-1);

  let element =
    _layer.elements[elementIdx];

  addAttributes(element, _layer);
  const image = await loadImage(`${_layer.location}${element.fileName}`);
  ctx.drawImage(
    image,
    _layer.position.x,
    _layer.position.y,
    _layer.size.width,
    _layer.size.height
  );
  saveLayer(canvas, _edition);
};

const loadCachedRarity = () => {
  layers.forEach((layer) => {
    layer.elements.forEach((element) => {
      cachedRarity.set(`${layer.id}${element.id}`, Math.floor(element.rarityPercent * edition));
    })
  })
  console.log(cachedRarity);
}

loadCachedRarity();

for (let i = 1; i <= edition; i++) {
  layers.forEach((layer) => {
    drawLayer(layer, i);
  });
  addMetadata(i);
  console.log("Creating edition " + i);
}

fs.readFile("./output/_metadata.json", (err, data) => {
  if (err) throw err;
  fs.writeFileSync("./output/_metadata.json", JSON.stringify(metadata));
});