interface PricingInput {baseDistanceKm: number;detourKm: number;poolSize: number;}

export const calculatePrice = ({baseDistanceKm,detourKm,poolSize,}: PricingInput): number => {
  const baseFare = 50; // flat
  const perKmRate = 10; // per km
  const detourPenaltyRate = 5; // per km detour
  
  const distanceCost = baseDistanceKm * perKmRate;  
  const detourCost = detourKm * detourPenaltyRate;
  
  const rawPrice = baseFare + distanceCost + detourCost;
  
  const poolingDiscountFactor = 1 - 0.1 * (poolSize - 1);
  const finalPrice = rawPrice * Math.max(poolingDiscountFactor, 0.3); // 10% discount per additional rider, capped at 30%

  return Math.round(finalPrice);
};
