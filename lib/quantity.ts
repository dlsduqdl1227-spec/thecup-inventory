const quantityNumber = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 2,
});

export type InventoryDisplayAmount = {
  value: string;
  unit: string;
};

export function formatInventoryAmount(
  quantity: number,
  unit: string,
): InventoryDisplayAmount {
  const normalizedUnit = unit.trim();
  if (normalizedUnit.toLowerCase() === "g" && Math.abs(quantity) >= 1000) {
    return { value: quantityNumber.format(quantity / 1000), unit: "kg" };
  }
  return { value: quantityNumber.format(quantity), unit: normalizedUnit };
}

export function formatInventoryQuantity(quantity: number, unit: string): string {
  const amount = formatInventoryAmount(quantity, unit);
  return `${amount.value}${amount.unit}`;
}

export function formatSignedInventoryQuantity(quantity: number, unit: string): string {
  return `${quantity > 0 ? "+" : ""}${formatInventoryQuantity(quantity, unit)}`;
}
