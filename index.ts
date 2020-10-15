import fs from "fs";
import signale from "signale";
import "@sentry/tracing";

import { MixstatusProcessor, bringOnline } from "prolink-connect";

async function writeNowPlayingToFile() {
  signale.await("Bringing up prolink network");
  const network = await bringOnline();
  signale.success("Network online, preparing to connect");

  network.deviceManager.on("connected", (d) =>
    signale.star("New device: %s [id: %s]", d.name, d.id)
  );

  signale.await("Autoconfiguring network.. waiting for devices");
  await network.autoconfigFromPeers();
  signale.await("Autoconfigure successfull!");

  signale.await("Connecting to network!");
  network.connect();

  if (!network.isConnected()) {
    signale.error("Failed to connect to the network");
    return;
  }

  signale.star("Network connected! Network services initalized");

  const processor = new MixstatusProcessor();
  network.statusEmitter.on("status", (s) => processor.handleState(s));

  processor.on("nowPlaying", async (state) => {
    const { deviceId, trackId, trackSlot, trackType } = state;

    const track = await network.db.getMetadata({
      trackId,
      trackType,
      trackSlot,
      deviceId,
    });

    console.log(track);

    // You can pick other stuff from track
    const trackName = `${track?.artist?.name} - ${track?.title}`;

    signale.note(`New track now playing! ${trackName}`);

    fs.writeFileSync("now_playing.txt", trackName);
  });
}

writeNowPlayingToFile();
