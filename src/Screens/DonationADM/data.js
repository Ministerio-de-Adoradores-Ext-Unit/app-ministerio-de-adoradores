export let donationCampaigns = [
  {
    id: 1,
    title: "campanha do AGASALHO",
    subtitle: "O FRIO NÃO ESPERA",
    description: "AQUEÇA O INVERNO DE QUEM PRECISA",
    imageUri: null,
    image: require("../../../assets/img/banner_doacao_1.png"),
  },
  {
    id: 2,
    title: "campanha do AGASALHO",
    subtitle: "O FRIO NÃO ESPERA",
    description: "AQUEÇA O INVERNO DE QUEM PRECISA",
    imageUri: null,
    image: require("../../../assets/img/banner_doacao_2.png"),
  },
];

export const getDonationCampaignSource = (campaign) =>
  campaign?.imageUri ? { uri: campaign.imageUri } : campaign?.image || null;

export const addDonationCampaign = (campaign) => {
  donationCampaigns = [campaign, ...donationCampaigns];
  return donationCampaigns;
};

export const removeDonationCampaign = (id) => {
  donationCampaigns = donationCampaigns.filter(
    (campaign) => campaign.id !== id,
  );
  return donationCampaigns;
};
