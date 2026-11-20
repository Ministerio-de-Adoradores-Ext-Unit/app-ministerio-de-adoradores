const initialImages = {
  "agasalho-1": require("../../../assets/img/banner_doacao_1.png"),
  "agasalho-2": require("../../../assets/img/banner_doacao_2.png"),
};

export function getDonationCampaignSource(campaign) {
  if (campaign?.imageUrl) return { uri: campaign.imageUrl };
  return Object.hasOwn(initialImages, campaign?.asset_key) ? initialImages[campaign.asset_key] : null;
}
