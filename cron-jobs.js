const cron = require("node-cron");
const { db } = require("./database");

const resetVenueCount = async () => {
  try {
    const genericSnapshot = await db.ref("generic").once("value");
    const cities = genericSnapshot.val();

    for (const cityId in cities) {
      const city = cities[cityId];
      for (const venueId in city) {
        if (
          venueId.startsWith("b") ||
          venueId.startsWith("o") ||
          venueId.startsWith("f") ||
          venueId.startsWith("s")
        ) {
          const venueRef = db.ref(`generic/${cityId}/${venueId}`);
          await venueRef.update({ count: 0, interested: [] });
        } else if (venueId.startsWith("u")) {
          const university = city[venueId];
          for (const subVenueId in university) {
            if (subVenueId.startsWith("f") || subVenueId.startsWith("s")) {
              const subVenueRef = db.ref(
                `generic/${cityId}/${venueId}/${subVenueId}`
              );
              await subVenueRef.update({ count: 0, interested: [] });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error resetting venue count:", err);
  }
};

const deletePastEvents = async () => {
  const currentDate = new Date().toISOString().split("T")[0];
  const eventsSnapshot = await db.collection("events").get();
  const pastEvents = eventsSnapshot.docs.filter(
    (doc) => doc.data().date < currentDate
  );

  for (const eventDoc of pastEvents) {
    await db.collection("events").doc(eventDoc.id).delete();
  }
};

// Schedule the cron job to run every day at 5 A.M.
cron.schedule("0 5 * * *", resetVenueCount);
// Schedule the cron job to delete past events every day at 5 A.M.
cron.schedule("0 5 * * *", deletePastEvents);
