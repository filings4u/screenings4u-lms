/**
 * screenings4u Learning Center
 * Training-only service and pricing catalog.
 * All checkout URLs stay on training.screenings4u.com.
 */
const TRAINING_SERVICES = {
  dot_specimen_collector_training: {
    id: "dot_specimen_collector_training", name: "DOT Specimen Collector Training", price: 32000, currency: "usd",
    courseId: "57d40c19-6232-4e18-88fc-e864f4aa855d", accessDays: 60,
    orderUrl: "checkout.html?product=dot_specimen_collector_training",
    description: "Self-paced DOT specimen collector training covering 49 CFR Part 40, collection procedures, chain of custody, site security and mock collections."
  },
  dot_specimen_collector_training_hair: {
    id: "dot_specimen_collector_training_hair", name: "DOT Specimen Collector Training + Hair", price: 36000, currency: "usd",
    courseId: "2718cf98-a318-42ee-bebc-ad5b9ee2b6de", accessDays: 60,
    orderUrl: "checkout.html?product=dot_specimen_collector_training_hair"
  },
  dot_specimen_collector_train_the_trainer: {
    id: "dot_specimen_collector_train_the_trainer", name: "DOT Specimen Collector Train the Trainer", price: 55000, currency: "usd",
    courseId: "c454e0ec-3087-4388-a538-5a5c6bf1cf0d", accessDays: 60,
    orderUrl: "checkout.html?product=dot_specimen_collector_train_the_trainer"
  },
  dot_collector_train_the_trainer_hair: {
    id: "dot_collector_train_the_trainer_hair", name: "DOT Collector Train the Trainer + Hair", price: 60000, currency: "usd",
    courseId: "d065de33-a16d-48de-ba0c-0a490b2039f1", accessDays: 60,
    orderUrl: "checkout.html?product=dot_collector_train_the_trainer_hair"
  },
  dot_specimen_group_5: {
    id: "dot_specimen_group_5", name: "Group 5", seats: 5, price: 150000, perSeat: 30000, currency: "usd",
    courseId: "57d40c19-6232-4e18-88fc-e864f4aa855d", accessDays: 60,
    orderUrl: "checkout.html?product=dot_specimen_group_5"
  },
  dot_specimen_group_10: {
    id: "dot_specimen_group_10", name: "Group 10", seats: 10, price: 280000, perSeat: 28000, currency: "usd",
    courseId: "57d40c19-6232-4e18-88fc-e864f4aa855d", accessDays: 60,
    orderUrl: "checkout.html?product=dot_specimen_group_10"
  },
  dot_specimen_group_25: {
    id: "dot_specimen_group_25", name: "Group 25", seats: 25, price: 625000, perSeat: 25000, currency: "usd",
    courseId: "57d40c19-6232-4e18-88fc-e864f4aa855d", accessDays: 60,
    orderUrl: "checkout.html?product=dot_specimen_group_25"
  },
  specimen_collector_training_supplies: {
    id: "specimen_collector_training_supplies", name: "Specimen Collector Training Supplies", price: 7500, currency: "usd",
    orderUrl: "checkout.html?product=specimen_collector_training_supplies"
  },
  training_course_extension_30_days: {
    id: "training_course_extension_30_days", name: "30-Day Course Access Extension", price: 10000, currency: "usd", extensionDays: 30,
    orderUrl: "course-extension.html"
  }
};
window.TRAINING_SERVICES = TRAINING_SERVICES;
