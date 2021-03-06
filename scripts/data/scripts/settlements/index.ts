import * as fs from "fs";
import * as TwsParser from "total-war-save-parser";

interface MapImageDimensions {
  readonly width: number;
  readonly height: number;
}

interface SettlementData {
  readonly key: string;
  readonly x: number;
  readonly y: number;
}

// 0,0 is bottom left
function toImageMapX(gameSettlementX: number, imageMapWidth: number, gameMapWidth: number) {
  const result = gameSettlementX * (imageMapWidth / gameMapWidth);
  return Math.round(result);
}

function toImageMapY(gameSettlementY: number, imageMapHeight: number, gameMapHeight: number) {
  const result = gameSettlementY * (imageMapHeight / gameMapHeight);
  return Math.round(result);
}

export function getSettlements(mapDataPath: string, dims: MapImageDimensions): { [key: string]: SettlementData } {
  const file = fs.readFileSync(mapDataPath);
  const rootNode = TwsParser.read(file);

  const [gameMapWidth, gameMapHeight] = rootNode.data
    .find(n => n.name === "theatres").data
    .find(n => n.name === "theatres - 0").data
    .find(n => n.name === "CAMPAIGN_THEATRE").data
    .find(n => n.name === "HEX_MAP_DATA").data;

  const regionBlocks = rootNode.data
    .find(n => n.name === "REGIONS_DATA").data
    .find(n => n.name === "MASKED_REGIONS_DATA").data
    .find(n => n.name === "MASKED_REGIONS_DATA - 0").data
    .find(n => n.name === "REGIONS_BLOCK").data;

  const regions = regionBlocks.reduce((accumulator, regionBlock) => {
    const regionData = regionBlock.data.find(n => n.name === "REGION_DATA");
    const settlementInfo = regionData.data.find(n => n.name === "SETTLEMENT_INFO");

    // only collect regions with settlementInfo: no chaos wastes or sea regions!
    if (settlementInfo) {
      // LOGICAL_POSITION_BIT_ARRAY contains settlement bounds: [x1, y1, x2, y2]?
      const [x1, y1] = settlementInfo.data.find(n => n.name === "LOGICAL_POSITION_BIT_ARRAY").data;

      // increment by 1 to center
      const gameSettlementX = x1 + 1;
      const gameSettlementY = y1 + 1;

      const regionKey = regionData.data[1];

      accumulator[regionKey] = {
        key: regionKey,
        x: toImageMapX(gameSettlementX, dims.width, gameMapWidth),
        y: toImageMapY(gameSettlementY, dims.height, gameMapHeight)
      };
    }

    return accumulator;
  }, {});

  return regions;
}
