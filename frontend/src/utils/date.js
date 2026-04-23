function getLocale() {
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang === "es" ? "es-AR" : "en-US";
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("es") ? "es-AR" : "en-US";
  }

  return "en-US";
}

export function formatDateLabel(value, options = {}) {
  return new Intl.DateTimeFormat(getLocale(), {
    month: "short",
    day: "numeric",
    ...options,
  }).format(new Date(value));
}

export function getLocalDateString(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().split("T")[0];
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat(getLocale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function groupActivitiesByDate(activityLogs) {
  return activityLogs.reduce((groups, activity) => {
    const key = formatDateLabel(activity.logged_at, { weekday: "long" });
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(activity);
    return groups;
  }, {});
}
