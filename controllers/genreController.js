const Genre = require("../models/genre");
const Book = require("../models/book");
const { body, validationResult } = require("express-validator");

// Display list of all Genre.
exports.genre_list = (req, res) => {
  Genre.find().sort("name").exec().then(list_genre=>{
    res.render("genre_list",{title:"Genre List", genre_list:list_genre})
  }).catch(err=>{
    return next(err);
  })
};

// Display detail page for a specific Genre.
exports.genre_detail = (req, res, next) => {
  Promise.all([Genre.findById(req.params.id).exec(),Book.find({ genre: req.params.id }).exec()]).then(results=>{
    if (results[0] == null) {
      // No results.
      const err = new Error("Genre not found");
      err.status = 404;
      return next(err);
    }
    // Successful, so render
    res.render("genre_detail", {
      title: "Genre Detail",
      genre: results[0],
      genre_books: results[1],
    });
  }).catch(err=>{
    return next(err);
  })
};


// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", { title: "Create Genre" });
};


// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name required").trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("genre_form", {
        title: "Create Genre",
        genre,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findOne({ name: req.body.name }).exec().then((found_genre=>{
        if (found_genre) {
          // Genre exists, redirect to its detail page.
          res.redirect(found_genre.url);
        } else {
          genre.save().then(()=>{
            res.redirect(genre.url);
          }).catch(err=>{
            return next(err);
          }); 
        }
      })).catch(err=>{
        return next(err);
      })
  }
},
];


// Display Genre delete form on GET.
exports.genre_delete_get = (req, res, next) => {
  Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find().elemMatch("genre",{$eq:req.params.id}) .exec(),
  ])
    .then((results) => {
      if (results[0] == null) {
        // No results.
        res.redirect("/catalog/genres");
      }
      // Successful, so render.
      res.render("genre_delete", {
        title: "Delete Genre",
        genre: results[0],
        genre_books: results[1],
      });
    })
    .catch((err) => {
      return next(err);
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = (req, res, next) => {
  Promise.all([
    Genre.findById(req.body.genreid).exec(),
    Book.find().elemMatch("genre",{$eq:req.body.genreid}) .exec(),
  ]).then(results=>{
    if (results[1].length > 0) {
      // Author has books. Render in same way as for GET route.
      res.render("genre_delete", {
        title: "Delete Genre",
        genre: results[0],
        genre_books: results[1],
      });
      return;
    }
    // Author has no books. Delete object and redirect to the list of authors.
    Genre.findByIdAndRemove(req.body.genreid).then(()=>{
      // Success - go to author list
      res.redirect("/catalog/genres");
    }).catch(err=>{
      return next(err);
    })
  }).catch(err=>{
    return next(err);
  });

};

// Display Genre update form on GET.
exports.genre_update_get = (req, res, next) => {
  // Get book, authors and genres for form.
  Genre.findById(req.params.id).then(result=>{
      if (result == null) {
        // No results.
        const err = new Error("Book not found");
        err.status = 404;
        return next(err);
      }
      // Success.
      // Mark our selected genres as checked.
      
      res.render("genre_form", {
        title: "Update Genre",
        genre:result,
      });
    }).catch(err=>{
      return next(err);
    });
};
// Handle Genre update on POST.
exports.genre_update_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name required").trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre({ name: req.body.name, _id:req.params.id});

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("genre_form", {
        title: "Create Genre",
        genre,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.
      // Check if Genre with same name already exists.
      Genre.findByIdAndUpdate(req.params.id,genre,{}).exec().then((found_genre=>{
        if (found_genre) {
          // Genre exists, redirect to its detail page.
          res.redirect(found_genre.url);
        }
      })).catch(err=>{
        return next(err);
      })
  }
},
];