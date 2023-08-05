const { db } = require("../database");

async function venueClick(req, res, next) {
  const cityId = req.params.cid;
  const venueId = req.body.venueId;
  const universityId = req.body.universityId;
  let venue = null;

  let venueRef;

  if (venueId[0] === "b" || venueId === "o") {
    venueRef = db.ref(`generic/${cityId}/${venueId}`);
    const snapshot = await venueRef.once("value");
    venue = snapshot.val();
  } else {
    venueRef = db.ref(`generic/${cityId}/${universityId}/${venueId}`);
    const snapshot = await venueRef.once("value");
    venue = snapshot.val();
  }

  if (!venue) {
    return next(new Error("Venue not found"));
  }

  const newCount = venue.count + 1;
  await venueRef.update({ count: newCount });

  res.json({
    message: "Click Successful",
    count: newCount,
  });
}

async function userClickedVenue(req, res, next) {
  const { userId, cityId, universityId, venueId } = req.body;

  try {
    let venueRef;
    if (venueId.startsWith("f") || venueId.startsWith("s")) {
      venueRef = db.ref(`generic/${cityId}/${universityId}/${venueId}`);
    } else if (venueId.startsWith("o") || venueId.startsWith("b")) {
      venueRef = db.ref(`generic/${cityId}/${venueId}`);
    } else {
      return res.status(400).json({ message: "Invalid venueId format." });
    }

    const venueSnapshot = await venueRef.once("value");
    const userRef = db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once("value");

    if (venueSnapshot.exists() && userSnapshot.exists()) {
      const venueData = venueSnapshot.val();
      const interested = venueData.interested || [];
      if (!interested.includes(userId)) {
        interested.push(userId);
        await venueRef.update({ interested });
      }

      const userData = userSnapshot.val();
      const clicks = userData.clicks ? userData.clicks + 1 : 1;
      await userRef.update({ clicks });

      res.status(200).json({
        message: "User added to interested and clicks updated successfully.",
      });
    } else {
      res.status(404).json({ message: "Venue or user not found." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add user to interested or update clicks." });
  }
}

async function userUnclickedVenue(req, res, next) {
  const { userId, cityId, universityId, venueId } = req.body;

  try {
    let venueRef;
    if (venueId.startsWith("f") || venueId.startsWith("s")) {
      venueRef = db.ref(`generic/${cityId}/${universityId}/${venueId}`);
    } else if (venueId.startsWith("o") || venueId.startsWith("b")) {
      venueRef = db.ref(`generic/${cityId}/${venueId}`);
    } else {
      return res.status(400).json({ message: "Invalid venueId format." });
    }

    const venueSnapshot = await venueRef.once("value");
    const userRef = db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once("value");

    if (venueSnapshot.exists() && userSnapshot.exists()) {
      const venueData = venueSnapshot.val();
      const interested = venueData.interested || [];
      const index = interested.indexOf(userId);
      if (index > -1) {
        interested.splice(index, 1);
        await venueRef.update({ interested });
      }

      const userData = userSnapshot.val();
      const clicks =
        userData.clicks && userData.clicks > 0 ? userData.clicks - 1 : 0;
      await userRef.update({ clicks });

      res.status(200).json({
        message:
          "User removed from interested and clicks updated successfully.",
      });
    } else {
      res.status(404).json({ message: "Venue or user not found." });
    }
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove user from interested or update clicks.",
    });
  }
}

module.exports = {
  venueClick,
    userClickedVenue,
    userUnclickedVenue,
};
