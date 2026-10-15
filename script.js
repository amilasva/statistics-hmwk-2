
"use strict";

// STATISTICS HOMEWORK 2
// Ethereum Wallet Pipeline and Statistical Properties

const TEST_MNEMONIC =
  "test test test test test test test test test test test junk";

const EXAMPLE_ADDRESS =
  "0x52908400098527886E0F7030069857D2E4169EE7";

const $ = (id) => document.getElementById(id);

function showError(id, message) {
  $(id).textContent = message;
}

function getEthers() {
  if (typeof ethers === "undefined") {
    throw new Error(
      "The cryptographic library could not load. Check your internet connection."
    );
  }
  return ethers;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function countBits(value) {
  let count = 0;
  while (value !== 0) {
    count += value & 1;
    value >>>= 1;
  }
  return count;
}

function hammingDistance(hexA, hexB) {
  const a = ethers.getBytes(hexA);
  const b = ethers.getBytes(hexB);

  if (a.length !== b.length) {
    throw new Error("Inputs must have equal lengths.");
  }

  let distance = 0;

  for (let i = 0; i < a.length; i++) {
    distance += countBits(a[i] ^ b[i]);
  }

  return distance;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0)
    / values.length;
}

function standardDeviation(values) {
  const average = mean(values);

  const variance = values.reduce(
    (sum, value) => sum + (value - average) ** 2,
    0
  ) / values.length;

  return Math.sqrt(variance);
}

// 1. WALLET DERIVATION

function deriveWallet() {
  try {
    const lib = getEthers();
    const index = Number($("addressIndex").value);

    if (!Number.isInteger(index) || index < 0 || index > 20) {
      throw new Error("Choose an address index between 0 and 20.");
    }

    const path = `m/44'/60'/0'/0/${index}`;
    $("pathDisplay").textContent = path;

    const root = lib.HDNodeWallet.fromPhrase(
      TEST_MNEMONIC,
      "",
      "m"
    );

    const wallet = root.derivePath(path);

    $("privateKeyResult").textContent = wallet.privateKey;
    $("publicKeyResult").textContent =
      wallet.signingKey.publicKey;
    $("addressResult").textContent = wallet.address;

    showError(
      "walletStatus",
      `Wallet derived successfully at address index ${index}.`
    );

    $("walletStatus").style.color = "#25806a";

  } catch (error) {
    showError("walletStatus", error.message);
    $("walletStatus").style.color = "#b64f62";
  }
}

// 2. HASH COMPARISON

function compareHashes() {
  try {
    const lib = getEthers();

    const messageA = $("messageA").value;
    const messageB = $("messageB").value;

    const hashA = lib.keccak256(lib.toUtf8Bytes(messageA));
    const hashB = lib.keccak256(lib.toUtf8Bytes(messageB));

    const distance = hammingDistance(hashA, hashB);

    $("hashA").textContent = hashA;
    $("hashB").textContent = hashB;
    $("hammingValue").textContent =
      `${distance} / 256`;

    const percentage = (distance / 256) * 100;

    showError(
      "hashStatus",
      `${percentage.toFixed(2)}% of the output bits are different.`
    );

    $("hashStatus").style.color = "#25806a";

  } catch (error) {
    showError("hashStatus", error.message);
    $("hashStatus").style.color = "#b64f62";
  }
}

// 3. AVALANCHE EFFECT

function runAvalancheExperiment() {
  try {
    const lib = getEthers();
    const trials = 30;
    const distances = [];

    for (let i = 0; i < trials; i++) {
      const original = randomBytes(32);
      const modified = new Uint8Array(original);

      const position = randomBytes(1)[0];
      const byteIndex = Math.floor(position / 8);
      const bitIndex = position % 8;

      modified[byteIndex] ^= (1 << bitIndex);

      const hashOriginal = lib.keccak256(original);
      const hashModified = lib.keccak256(modified);

      distances.push(
        hammingDistance(hashOriginal, hashModified)
      );
    }

    const average = mean(distances);
    const deviation = standardDeviation(distances);

    $("avalancheMean").textContent = average.toFixed(2);
    $("avalancheStd").textContent = deviation.toFixed(2);

    const chart = $("avalancheChart");
    chart.innerHTML = "";

    distances.forEach((distance, index) => {
      const bar = document.createElement("div");
      bar.className = "bar";

      bar.style.height = `${(distance / 256) * 100}%`;
      bar.title = `Trial ${index + 1}: ${distance} changed bits`;

      chart.appendChild(bar);
    });

  } catch (error) {
    alert(error.message);
  }
}

// 4. STATISTICAL EXPLORATION

function generateStatistics() {
  try {
    const lib = getEthers();

    const sampleSize = 200;
    const hexCharacters = "0123456789abcdef";

    const frequencies = Object.fromEntries(
      [...hexCharacters].map(char => [char, 0])
    );

    let zeros = 0;
    let ones = 0;

    for (let i = 0; i < sampleSize; i++) {
      const input = randomBytes(32);
      const hash = lib.keccak256(input);
      const bytes = lib.getBytes(hash);

      for (const byte of bytes) {
        const oneBits = countBits(byte);
        ones += oneBits;
        zeros += 8 - oneBits;
      }

      const hex = hash.slice(2).toLowerCase();

      for (const char of hex) {
        frequencies[char]++;
      }
    }

    const totalBits = zeros + ones;
    const totalHex = sampleSize * 64;

    const expectedBits = totalBits / 2;
    const chiSquare =
      ((zeros - expectedBits) ** 2 / expectedBits) +
      ((ones - expectedBits) ** 2 / expectedBits);

    $("totalBits").textContent =
      totalBits.toLocaleString("en-US");

    $("onesPercent").textContent =
      `${(ones / totalBits * 100).toFixed(2)}%`;

    $("chiSquare").textContent =
      chiSquare.toFixed(3);

    renderBitChart(zeros, ones);
    renderHexChart(frequencies, totalHex);

    const zeroPercent = (zeros / totalBits * 100).toFixed(2);
    const onePercent = (ones / totalBits * 100).toFixed(2);

    $("statsInterpretation").textContent =
      `From ${sampleSize} Keccak-256 outputs, ` +
      `${zeroPercent}% of bits were zeros and ` +
      `${onePercent}% were ones. ` +
      `The expected proportion for each bit is 50%. ` +
      `The chi-square statistic compares the observed ` +
      `bit counts with this theoretical expectation. ` +
      `Small differences are normal in finite samples.`;

  } catch (error) {
    $("statsInterpretation").textContent = error.message;
  }
}

function renderBitChart(zeros, ones) {
  const chart = $("bitChart");
  chart.innerHTML = "";

  const values = [
    { label: "0 bits", count: zeros },
    { label: "1 bits", count: ones }
  ];

  const maximum = Math.max(zeros, ones);

  values.forEach(item => {
    const column = document.createElement("div");
    column.className = "bit-column";

    const number = document.createElement("span");
    number.textContent = item.count.toLocaleString("en-US");

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height =
      `${(item.count / maximum) * 125}px`;

    const label = document.createElement("span");
    label.textContent = item.label;

    column.appendChild(number);
    column.appendChild(bar);
    column.appendChild(label);

    chart.appendChild(column);
  });
}

function renderHexChart(frequencies, totalHex) {
  const chart = $("hexChart");
  chart.innerHTML = "";

  const maximum = Math.max(
    ...Object.values(frequencies)
  );

  for (const [character, frequency] of
    Object.entries(frequencies)) {

    const column = document.createElement("div");
    column.className = "hex-column";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height =
      `${(frequency / maximum) * 140}px`;

    const label = document.createElement("span");
    label.textContent = character;

    const percent = (frequency / totalHex * 100).toFixed(2);

    bar.title =
      `${character}: ${frequency} occurrences (${percent}%)`;

    column.appendChild(bar);
    column.appendChild(label);
    chart.appendChild(column);
  }
}

// 5. EIP-55 CHECKSUM VALIDATION

function validateChecksum() {
  const result = $("checksumResult");

  try {
    const lib = getEthers();
    const address = $("checksumInput").value.trim();

    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(
        "Invalid format: an Ethereum address needs 40 hexadecimal characters."
      );
    }

    const checksummed = lib.getAddress(address);

    const allLower =
      address.slice(2) === address.slice(2).toLowerCase();

    const allUpper =
      address.slice(2) === address.slice(2).toUpperCase();

    if (allLower || allUpper) {
      result.className = "checksum-result neutral";
      result.textContent =
        "Valid hexadecimal address format, but the mixed-case " +
        "checksum is not being tested. EIP-55 form: " +
        checksummed;
    } else {
      result.className = "checksum-result valid";
      result.textContent =
        "Valid EIP-55 checksum. The letter casing matches " +
        "the expected Keccak-256 checksum.";
    }

  } catch (error) {
    result.className = "checksum-result invalid";
    result.textContent =
      "Checksum validation failed: " + error.message;
  }
}

function introduceCaseError() {
  const address = $("checksumInput").value;

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    $("checksumResult").className =
      "checksum-result invalid";
    $("checksumResult").textContent =
      "Restore a valid example before introducing a case error.";
    return;
  }

  let correctAddress;

  try {
    correctAddress = getEthers().getAddress(address);
  } catch {
    correctAddress = getEthers().getAddress(
      address.toLowerCase()
    );
  }

  const chars = [...correctAddress];

  for (let i = 2; i < chars.length; i++) {
    if (/[a-fA-F]/.test(chars[i])) {
      chars[i] =
        chars[i] === chars[i].toLowerCase()
          ? chars[i].toUpperCase()
          : chars[i].toLowerCase();
      break;
    }
  }

  $("checksumInput").value = chars.join("");
  validateChecksum();
}

function restoreChecksum() {
  $("checksumInput").value = EXAMPLE_ADDRESS;
  validateChecksum();
}

// 6. INITIALIZATION

document.addEventListener("DOMContentLoaded", () => {
  $("deriveBtn").addEventListener("click", deriveWallet);
  $("compareBtn").addEventListener("click", compareHashes);

  $("avalancheBtn").addEventListener(
    "click",
    runAvalancheExperiment
  );

  $("statsBtn").addEventListener(
    "click",
    generateStatistics
  );

  $("validateBtn").addEventListener(
    "click",
    validateChecksum
  );

  $("typoBtn").addEventListener(
    "click",
    introduceCaseError
  );

  $("restoreBtn").addEventListener(
    "click",
    restoreChecksum
  );

  $("addressIndex").addEventListener("input", () => {
    const index = $("addressIndex").value;
    $("pathDisplay").textContent =
      `m/44'/60'/0'/0/${index}`;
  });

  if (typeof ethers !== "undefined") {
    deriveWallet();
    compareHashes();
    validateChecksum();
    generateStatistics();
    runAvalancheExperiment();
  } else {
    showError(
      "walletStatus",
      "Unable to load ethers.js. Check your connection."
    );
  }
});
