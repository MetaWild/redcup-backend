const { db } = require("../database");

async function getUserOrAddUser(req, res, next) {
  const uid = req.body.id;
  const email = req.body.email;
  const name = req.body.name;

  const defaultUser = {
    email: email,
    subscription: false,
    clicks: 0,
  };

  const defaultPublic = {
    name: name,
    photoUrl: "",
  };

  const defaultUsername = {
    username: "",
  };

  try {
    const userSnapshot = await db.ref("users/" + uid).once("value");
    let userData, publicData, usernameData;

    if (userSnapshot.exists()) {
      // If user exists, get user's data
      userData = userSnapshot.val();

      // Also get share and username data
      const publicSnapshot = await db.ref("public/" + uid).once("value");
      publicData = publicSnapshot.exists()
        ? publicSnapshot.val()
        : defaultPublic;

      const usernameSnapshot = await db.ref("usernames/" + uid).once("value");
      usernameData = usernameSnapshot.exists()
        ? usernameSnapshot.val()
        : defaultUsername;
    } else {
      // If user doesn't exist, add default user, share, and username data
      await db.ref("users/" + uid).set(defaultUser);
      await db.ref("public/" + uid).set(defaultPublic);
      await db.ref("usernames/" + uid).set(defaultUsername);

      userData = defaultUser;
      publicData = defaultPublic;
      usernameData = defaultUsername;
    }

    // Combine all data and return
    const combinedData = {
      ...userData,
      ...publicData,
      ...usernameData,
    };
    res.json({ data: combinedData });
  } catch (error) {
    next(error);
  }
}

function getAllUsernames(req, res, next) {
  db.ref("usernames")
    .once("value")
    .then((snapshot) => {
      const usernameData = snapshot.val();
      const usernames = Object.keys(usernameData).map((uid) => {
        return {
          uid: uid,
          username: usernameData[uid].username,
        };
      });
      res.json({ data: usernames });
    })
    .catch((error) => {
      next(error);
    });
}

async function attachCountToVenue(req, res, next) {
  const currentDataState = req.body.currentDataState;
  if (!Array.isArray(currentDataState)) {
    return next(new Error("Invalid data: currentDataState is not an array"));
  }
  try {
    const citiesRef = db.ref("generic");
    const snapshot = await citiesRef.once("value");
    const cities = snapshot.val();

    const updatedData = currentDataState.map((city) => {
      if (city.universities) {
        city.universities.forEach((university) => {
          if (university.fraternities) {
            university.fraternities.forEach((fraternity) => {
              fraternity.count =
                cities[city.id]?.[university.id]?.[fraternity.id]?.count || 0;
              fraternity.interested =
                cities[city.id]?.[university.id]?.[fraternity.id]?.interested ||
                [];
            });
          }
          if (university.schoolOrganizations) {
            university.schoolOrganizations.forEach((schoolOrganization) => {
              schoolOrganization.count =
                cities[city.id]?.[university.id]?.[schoolOrganization.id]
                  ?.count || 0;
              schoolOrganization.interested =
                cities[city.id]?.[university.id]?.[schoolOrganization.id]
                  ?.interested || [];
            });
          }
        });
      }
      if (city.organizations) {
        city.organizations.forEach((organization) => {
          organization.count = cities[city.id]?.[organization.id]?.count || 0;
          organization.interested =
            cities[city.id]?.[organization.id]?.interested || [];
        });
      }
      if (city.bars) {
        city.bars.forEach((bar) => {
          bar.count = cities[city.id]?.[bar.id]?.count || 0;
          bar.interested = cities[city.id]?.[bar.id]?.interested || [];
        });
      }
      return city;
    });

    res.json(updatedData);
  } catch (err) {
    return next(new Error("Error attaching count to venues: " + err.message));
  }
}

async function sendFriendRequest(req, res, next) {
  const { friendId, userId } = req.body;

  try {
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once("value");

    if (snapshot.exists()) {
      await userRef.child("friendRequests").push(friendId);
      res.status(200).json({ message: "Friend request sent successfully." });
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to send friend request." });
  }
}

async function acceptFriendRequest(req, res, next) {
  const { userId, friendId } = req.body;

  try {
    const userRef = db.ref(`users/${userId}`);
    const friendRef = db.ref(`users/${friendId}`);
    const [userSnapshot, friendSnapshot] = await Promise.all([
      userRef.once("value"),
      friendRef.once("value"),
    ]);

    if (userSnapshot.exists() && friendSnapshot.exists()) {
      const userData = userSnapshot.val();
      const friendData = friendSnapshot.val();
      const userFriendRequests = userData.friendRequests || {};
      const friendFriendRequests = friendData.friendRequests || {};
      let friendRequestKey = null;
      let friendFriendRequestKey = null;

      for (const key in userFriendRequests) {
        if (userFriendRequests[key] === friendId) {
          friendRequestKey = key;
          break;
        }
      }

      for (const key in friendFriendRequests) {
        if (friendFriendRequests[key] === userId) {
          friendFriendRequestKey = key;
          break;
        }
      }

      if (friendRequestKey && friendFriendRequestKey) {
        // Remove friendId from friendRequests and add it to friends
        const userUpdates = {
          [`friendRequests/${friendRequestKey}`]: null,
          [`friends/${friendId}`]: true,
        };
        const friendUpdates = {
          [`friendRequests/${friendFriendRequestKey}`]: null,
          [`friends/${userId}`]: true,
        };
        await Promise.all([
          userRef.update(userUpdates),
          friendRef.update(friendUpdates),
        ]);
        res.status(200).json({ message: "Friend added successfully." });
      } else {
        res.status(404).json({ message: "Friend request not found." });
      }
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to add friend." });
  }
}

async function denyFriendRequest(req, res, next) {
  const { userId, friendId } = req.body;

  try {
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once("value");

    if (snapshot.exists()) {
      const userData = snapshot.val();
      const friendRequests = userData.friendRequests || {};
      let friendRequestKey = null;

      for (const key in friendRequests) {
        if (friendRequests[key] === friendId) {
          friendRequestKey = key;
          break;
        }
      }

      if (friendRequestKey) {
        // Remove friendId from friendRequests
        await userRef.child(`friendRequests/${friendRequestKey}`).remove();
        res
          .status(200)
          .json({ message: "Friend request denied successfully." });
      } else {
        res.status(404).json({ message: "Friend request not found." });
      }
    } else {
      res.status(404).json({ message: "User not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Failed to deny friend request." });
  }
}

module.exports = {
  getUserOrAddUser,
  getAllUsernames,
  attachCountToVenue,
  sendFriendRequest,
  acceptFriendRequest,
  denyFriendRequest,
};
