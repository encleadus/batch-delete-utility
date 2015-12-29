var data;

$(document).ready(function() {
  if (sessionStorage.getItem("fulcrum_token")) {
    $("#api-key").val(atob(sessionStorage.getItem("fulcrum_token")));
  }
});

$("#api-key").keyup(function() {
  sessionStorage.setItem("fulcrum_token", btoa($("#api-key").val()));
});

$("#about-btn").click(function() {
  $("#aboutModal").modal("show");
  return false;
});

$("#logout-btn").click(function() {
  sessionStorage.removeItem("fulcrum_token");
  location.reload();
  return false;
});

$("#filter-btn").click(function() {
  $("#filterModal").modal("show");
  return false;
});

$("#view-sql-btn").click(function() {
  alert($("#query-builder").queryBuilder("getSQL", false, false).sql);
  return false;
});

$("#apply-filter-btn").click(function() {
  applyFilter();
  return false;
});

$("#reset-filter-btn").click(function() {
  $("#query-builder").queryBuilder("reset");
  applyFilter();
  $("#query-builder").queryBuilder("reset");
  return false;
});

$(".btn-danger").click(function() {
  if (!sessionStorage.getItem("fulcrum_token")) {
    alert("Please set your API Key!");
    return false;
  }
  var count = $("#table").bootstrapTable("getSelections").length;
  if (count > 0) {
    var response = confirm("Are you absolutely sure you want to delete " + count + " records?\nThis cannot be undone!");
    if (response === true) {
      deleteRecords();
    } else {
      alert("No records deleted.");
    }
  } else {
    alert("No records selected.");
  }
  return false;
});

$(".csv-upload-btn").click(function() {
  $("#table").bootstrapTable("destroy");
  $("#table thead").empty();
  $("#toolbar").addClass("hide");
  $("#start-screen").removeClass("hide");
  $("#csv-upload-input").trigger("click");
  return false;
});

$("#csv-upload-input").change(function(evt) {
  var file = evt.target.files[0];
  var filters = [];
  $("<div class='modal-backdrop fade in'></div>").appendTo(document.body);
  $("#loading").show();
  Papa.parse(file, {
    skipEmptyLines: true,
    header: true,
    dynamicTyping: true,
		complete: function(results) {
      var header = $("<tr>");
      header.append("<th data-field='state' data-checkbox='true'></th>");
      if ($.inArray("fulcrum_id", results.meta.fields) != -1) {
        data = results.data;
        $.each(results.meta.fields, function(index, value) {
          var type;
          if (typeof data[0][value] == "number"){
            if (parseInt(data[0][value]) === data[0][value]) {
              type = "integer";
            } else {
              type = "double";
            }
          } else {
            type = "string";
          }
          filters.push({
            id: value,
            label: value,
            type: type
          });
          header.append("<th data-field='"+value+"' data-sortable='true'>"+value+"</th>");
        });
        $("#table thead").append(header);
        $("#table").bootstrapTable({
          data: data
        });
        $("#toolbar").removeClass("hide");
        $("#table").bootstrapTable("resetView", {
          height: $(window).height()-70
        });
      } else {
        alert("CSV file must contain fulcrum_id field containing unique record identifier!");
      }
      $("#query-builder").queryBuilder('destroy');
      $("#query-builder").queryBuilder({
        allow_empty: true,
        filters: filters
      });
      $("#feature-count").html($("#table").bootstrapTable("getData").length + " records");
      $("#loading").hide();
      $(".modal-backdrop").remove();
		}
	});
  $(this).val("");
  $("#start-screen").addClass("hide");
});

function applyFilter() {
  var query = "SELECT * FROM ?";
  var sql = $("#query-builder").queryBuilder("getSQL", false, false).sql;
  if (sql.length > 0) {
    query += " WHERE " + sql;
  }
  alasql(query, [data], function(records){
    $("#table").bootstrapTable("load", JSON.parse(JSON.stringify(records)));
  });
  $("#feature-count").html($("#table").bootstrapTable("getData").length + " records");
}

function deleteRecords() {
  var selections = $("#table").bootstrapTable("getSelections");
  var deleted = 0;
  var notfound = [];
  var unauthorized = [];
  $.each(selections, function(index, value) {
    $.ajax({
      async: false,
      url: "https://api.fulcrumapp.com/api/v2/records/" + value.fulcrum_id + ".json",
      type: "DELETE",
      contentType: "application/json",
      dataType: "json",
      headers: {
        "X-ApiToken": atob(sessionStorage.getItem("fulcrum_token"))
      },
      statusCode: {
        401: function() {
          unauthorized.push(value.fulcrum_id);
        },
        404: function() {
          notfound.push(value.fulcrum_id);
        },
        204: function() {
          $("#table").bootstrapTable("remove", {
            field: "fulcrum_id",
            values: [value.fulcrum_id]
          });
          deleted++;
        }
      }
    });
  });
  if (unauthorized.length > 0) {
    alert("You were unauthorized to delete the following records: " + unauthorized.join("\n"));
  }
  if (notfound.length > 0) {
    alert("The following records were not found in your account: " + notfound.join("\n"));
  }
  if (deleted > 0) {
    alert(deleted + " records deleted!");
  }
}

$(window).resize(function () {
  $("#table").bootstrapTable("resetView", {
    height: $(window).height()-70
  });
});
