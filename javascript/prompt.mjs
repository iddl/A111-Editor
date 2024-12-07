import Exifr from './lib-exifr.mjs';

async function getPrompt(src) {
  const response = await fetch(src);
  const blob = await response.blob();

  // Convert the blob to a data URI
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  await new Promise((resolve) => {
    reader.onloadend = resolve;
  });
  const dataUri = reader.result;

  const exifData = await Exifr.parse(dataUri);

  return exifData?.parameters ? exifData.parameters : null;
}

async function setPrompt(dataURI, prompt) {
  // ... OK, so this is too hardcore for a browser environment. I guess.. But it does work
  // Let's revisit if we need to move this to the server after...

  const existingPrompt = await getPrompt(dataURI);
  if (existingPrompt) {
    console.log('Prompt already exists, skipping setting prompt');
    return;
  }

  /*
   * Part 1: Prepare the bytes needed to represent the prompt in the PNG
   * PNGs are made of various chunks, each chunk has a type, a length, the data and a CRC32 checksum
   * The tEXt chunk is used to store metadata, it has a keyword and a text string
   * The keyword 'parameters' followed by a null byte and the prompt
   */
  const iso88591Encoder = new TextEncoder('iso-8859-1');
  const body = new Uint8Array([
    ...iso88591Encoder.encode('tEXtparameters'),
    0x00,
    ...iso88591Encoder.encode(prompt),
  ]);
  const bodyLen = body.length - 4; // exclude the 'tEXt' string

  const tEXtChunk = new Uint8Array([
    // this is a uint32 representing the length of the chunk
    // PNG requires big-endian on the integer that's why the shifts and masks
    ...new Uint8Array([
      (bodyLen >>> 24) & 0xff,
      (bodyLen >>> 16) & 0xff,
      (bodyLen >>> 8) & 0xff,
      bodyLen & 0xff,
    ]),
    ...body,
    ...crc32(body),
  ]);

  /*
   * Part 2: Figure out where we need to inject the tEXt chunk
   */
  const response = await fetch(dataURI);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  // The IHDR chunk is the first chunk in a PNG, figure out its size
  // since we need to skip over it
  const IHDRSize = new DataView(bytes.slice(8, 12).buffer).getUint32(0);
  // figure out where the first IHDR chunk ends and slice there
  const sliceAt = 16 + IHDRSize + 4;

  /*
   * Part 3 inject the bytes
   */
  const before = bytes.slice(0, sliceAt);
  const after = bytes.slice(sliceAt);
  const newBytes = new Uint8Array(
    before.length + tEXtChunk.length + after.length
  );

  newBytes.set(before, 0);
  newBytes.set(tEXtChunk, before.length);
  newBytes.set(after, before.length + tEXtChunk.length);

  // Convert the new bytes to a Blob and then to a data URI
  const newBlob = new Blob([newBytes], { type: 'image/png' });
  const newReader = new FileReader();
  newReader.readAsDataURL(newBlob);
  await new Promise((resolve) => {
    newReader.onloadend = resolve;
  });
  const newDataUri = newReader.result;

  return newDataUri;
}

function crc32(uint8Array) {
  const crcTable = new Uint32Array(256).map((_, i) => {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return c;
  });

  let crc = 0xffffffff;
  for (let i = 0; i < uint8Array.length; i++) {
    const byte = uint8Array[i];
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  crc = crc ^ 0xffffffff;
  const crcArray = new Uint8Array(4);
  crcArray[0] = (crc >>> 24) & 0xff;
  crcArray[1] = (crc >>> 16) & 0xff;
  crcArray[2] = (crc >>> 8) & 0xff;
  crcArray[3] = crc & 0xff;

  return crcArray;
}

async function mergePrompts(sources) {
  // This is a very rudimentary way to take multiple propmts and pick the best one
  const prompts = await Promise.all(sources.map((src) => getPrompt(src)));
  const scoredPrompts = prompts.map((prompt) => {
    let score = 0;
    if (!prompt) {
      score = 0;
    } else if (prompt.includes('Mask blur')) {
      // inpaint prompts usually describe a small detail rather than the full image
      // so they're less likely to be as good as full txt2img prompts
      score = 1;
    } else {
      score = 2;
    }
    return { prompt, score };
  });

  const bestPrompt = scoredPrompts.reduce(
    (best, current) => {
      return current.score > best.score ? current : best;
    },
    { prompt: null, score: 0 }
  );

  return bestPrompt.prompt;
}

/*
 * This logic is compiled Typescript from
 *  https://github.com/jiw0220/stable-diffusion-image-metadata/blob/main/src/index.ts
 */
const imageMetadataKeys = [
  ['Seed', 'seed'],
  ['CFG scale', 'cfgScale'],
  ['Sampler', 'sampler'],
  ['Steps', 'steps'],
  ['Clip skip', 'clipSkip'],
  ['Size', 'size'],
];
const imageMetaKeyMap = new Map(imageMetadataKeys);
const automaticExtraNetsRegex =
  /<(lora|hypernet):([a-zA-Z0-9_\.]+):([0-9.]+)>/g;
const automaticNameHash = /([a-zA-Z0-9_\.]+)\(([a-zA-Z0-9]+)\)/;
const getImageMetaKey = (key, keyMap) => {
  var _a;
  return (_a = keyMap.get(key.trim())) !== null && _a !== void 0
    ? _a
    : key.trim();
};
const stripKeys = ['Template: ', 'Negative Template: '];
function preproccessFormatJSONValueFn(v) {
  try {
    return JSON.parse(v);
  } catch (e) {
    return v;
  }
}

function preproccessFormatHandler(configValue, inputValue) {
  console.info(configValue);
  if (typeof configValue === 'function') {
    return configValue.call(null, inputValue);
  }
  return configValue;
}

const preproccessConfigs = [
  { reg: /(ControlNet \d+): "([^"]+)"/g },
  { reg: /(Lora hashes): "([^"]+)"/g },
  {
    reg: /(Hashes): ({[^}]+})/g,
    key: 'hashes',
    value: preproccessFormatJSONValueFn,
  },
  //...There should be many configs that need to be preprocessed in the future
];

function parsePrompt(parameters) {
  var _a;
  const metadata = {};
  if (!parameters) return metadata;
  const metaLines = parameters.split('\n').filter((line) => {
    return line.trim() !== '' && !stripKeys.some((key) => line.startsWith(key));
  });
  let detailsLineIndex = metaLines.findIndex((line) =>
    line.startsWith('Steps: ')
  );
  let detailsLine = metaLines[detailsLineIndex] || '';
  // Strip it from the meta lines
  if (detailsLineIndex > -1) metaLines.splice(detailsLineIndex, 1);
  // Remove meta keys I wish I hadn't made... :(
  preproccessConfigs.forEach(({ reg, key: configKey, value: configValue }) => {
    let matchData = {};
    let matchValues = [];
    let match;
    while ((match = reg.exec(detailsLine)) !== null) {
      const key =
        configKey !== void 0
          ? preproccessFormatHandler(configKey, match[1])
          : match[1];
      const value =
        configValue !== void 0
          ? preproccessFormatHandler(configValue, match[2])
          : match[2];
      matchData[key] = value;
      matchValues.push(match[0]);
    }
    matchValues.forEach(
      (value) => (detailsLine = detailsLine.replace(value, ''))
    );
    Object.assign(metadata, matchData);
  });
  detailsLine.split(', ').forEach((str) => {
    const [_k, _v] = str.split(': ');
    if (!_k) return;
    const key = getImageMetaKey(_k, imageMetaKeyMap);
    metadata[key] = _v;
  });
  // Extract prompts
  const [prompt, ...negativePrompt] = metaLines
    .join('\n')
    .split('Negative prompt:')
    .map((x) => x.trim());
  metadata.prompt = prompt;
  metadata.negativePrompt = negativePrompt.join(' ').trim();
  // Extract resources
  const extranets = [...prompt.matchAll(automaticExtraNetsRegex)];
  const resources = extranets.map(([, type, name, weight]) => ({
    type,
    name,
    weight: parseFloat(weight),
  }));
  if (metadata.Size || metadata.size) {
    const sizes = (metadata.Size || metadata.size || '0x0').split('x');
    if (!metadata.width) {
      metadata.width = parseFloat(sizes[0]) || 0;
    }
    if (!metadata.height) {
      metadata.height = parseFloat(sizes[1]) || 0;
    }
  }
  if (metadata['Model'] && metadata['Model hash']) {
    const model = metadata['Model'];
    const modelHash = metadata['Model hash'];
    if (!metadata.hashes) metadata.hashes = {};
    if (!metadata.hashes['model']) metadata.hashes['model'] = modelHash;
    resources.push({
      type: 'model',
      name: model,
      hash: modelHash,
    });
  }
  if (metadata['Hypernet'] && metadata['Hypernet strength'])
    resources.push({
      type: 'hypernet',
      name: metadata['Hypernet'],
      weight: parseFloat(metadata['Hypernet strength']),
    });
  if (metadata['AddNet Enabled'] === 'True') {
    let i = 1;
    while (true) {
      const fullname = metadata[`AddNet Model ${i}`];
      if (!fullname) break;
      const [, name, hash] =
        (_a = fullname.match(automaticNameHash)) !== null && _a !== void 0
          ? _a
          : [];
      resources.push({
        type: metadata[`AddNet Module ${i}`].toLowerCase(),
        name,
        hash,
        weight: parseFloat(metadata[`AddNet Weight ${i}`]),
      });
      i++;
    }
  }
  metadata.resources = resources;
  return metadata;
}

export { setPrompt, mergePrompts, getPrompt, parsePrompt };
