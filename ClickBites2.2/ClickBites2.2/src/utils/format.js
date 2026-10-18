export function peso(value) {
  return `₱${Number(value).toLocaleString("en-PH")}`;
}

export function dateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}