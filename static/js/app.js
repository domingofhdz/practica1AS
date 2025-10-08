function activeMenuOption(href) {
    $("#appMenu .nav-link")
    .removeClass("active")
    .removeAttr('aria-current')

    $(`[href="${(href ? href : "#/")}"]`)
    .addClass("active")
    .attr("aria-current", "page")
}
function disableAll() {
    const elements = document.querySelectorAll(".while-waiting")
    elements.forEach(function (el, index) {
        el.setAttribute("disabled", "true")
        el.classList.add("disabled")
    })
}
function enableAll() {
    const elements = document.querySelectorAll(".while-waiting")
    elements.forEach(function (el, index) {
        el.removeAttribute("disabled")
        el.classList.remove("disabled")
    })
}
function debounce(fun, delay) {
    let timer
    return function (...args) {
        clearTimeout(timer)
        timer = setTimeout(function () {
            fun.apply(this, args)
        }, delay)
    }
}

const configFechaHora = {
    locale: "es",
    weekNumbers: true,
    // enableTime: true,
    minuteIncrement: 15,
    altInput: true,
    altFormat: "d/F/Y",
    dateFormat: "Y-m-d",
    // time_24hr: false
}

const DateTime = luxon.DateTime
let lxFechaHora
let diffMs = 0

const app = angular.module("angularjsApp", ["ngRoute"])
app.config(function ($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix("")

    $routeProvider
    .when("/", {
        templateUrl: "login",
        controller: "loginCtrl"
    })
    .when("/productos", {
        templateUrl: "productos",
        controller: "productosCtrl"
    })



    .when("/decoraciones", {
        templateUrl: "decoraciones",
        controller: "decoracionesCtrl"
    })



    .otherwise({
        redirectTo: "/"
    })
})
app.run(["$rootScope", "$location", "$timeout", function($rootScope, $location, $timeout) {
    $rootScope.slide             = ""
    $rootScope.spinnerGrow       = false
    $rootScope.sendingRequest    = false
    $rootScope.incompleteRequest = false
    $rootScope.completeRequest   = false
    $rootScope.login             = localStorage.getItem("login")
    const defaultRouteAuth       = "#/productos"
    let timesChangesSuccessRoute = 0


    function actualizarFechaHora() {
        lxFechaHora = DateTime.now().plus({
            milliseconds: diffMs
        })

        $rootScope.angularjsHora = lxFechaHora.setLocale("es").toFormat("hh:mm:ss a")
        $timeout(actualizarFechaHora, 500)
    }
    actualizarFechaHora()


    let preferencias = localStorage.getItem("preferencias")
    try {
        preferencias = (preferencias ? JSON.parse(preferencias) :  {})
    }
    catch (error) {
        preferencias = {}
    }
    $rootScope.preferencias = preferencias


    $rootScope.$on("$routeChangeSuccess", function (event, current, previous) {
        $rootScope.spinnerGrow = false
        const path             = current.$$route.originalPath


        // AJAX Setup
        $.ajaxSetup({
            beforeSend: function (xhr) {
                // $rootScope.sendingRequest = true
            },
            headers: {
                Authorization: `Bearer ${localStorage.getItem("JWT")}`
            },
            error: function (error) {
                $rootScope.sendingRequest    = false
                $rootScope.incompleteRequest = false
                $rootScope.completeRequest   = true

                const status = error.status
                enableAll()

                if (status) {
                    const respuesta = error.responseText
                    console.log("error", respuesta)

                    if (status == 401) {
                        cerrarSesion()
                        return
                    }

                    modal(respuesta, "Error", [
                        {html: "Aceptar", class: "btn btn-lg btn-secondary", defaultButton: true, dismiss: true}
                    ])
                }
                else {
                    toast("Error en la petici&oacute;n.")
                    $rootScope.sendingRequest    = false
                    $rootScope.incompleteRequest = true
                    $rootScope.completeRequest   = false
                }
            },
            statusCode: {
                200: function (respuesta) {
                    $rootScope.sendingRequest    = false
                    $rootScope.incompleteRequest = false
                    $rootScope.completeRequest   = true
                },
                401: function (respuesta) {
                    cerrarSesion()
                },
            }
        })

        // solo hacer si se carga una ruta existente que no sea el splash
        if (path.indexOf("splash") == -1) {
            // validar login
            function validarRedireccionamiento() {
                const login = localStorage.getItem("login")

                if (login) {
                    if (path == "/") {
                        window.location = defaultRouteAuth
                        return
                    }

                    $(".btn-cerrar-sesion").click(function (event) {
                        $.post("cerrarSesion")
                        $timeout(function () {
                            cerrarSesion()
                        }, 500)
                    })
                }
                else if ((path != "/")
                    &&  (path.indexOf("emailToken") == -1)
                    &&  (path.indexOf("resetPassToken") == -1)) {
                    window.location = "#/"
                }
            }
            function cerrarSesion() {
                localStorage.removeItem("JWT")
                localStorage.removeItem("login")
                localStorage.removeItem("preferencias")

                const login      = localStorage.getItem("login")
                let preferencias = localStorage.getItem("preferencias")

                try {
                    preferencias = (preferencias ? JSON.parse(preferencias) :  {})
                }
                catch (error) {
                    preferencias = {}
                }

                $rootScope.redireccionar(login, preferencias)
            }
            $rootScope.redireccionar = function (login, preferencias) {
                $rootScope.login        = login
                $rootScope.preferencias = preferencias

                validarRedireccionamiento()
            }
            validarRedireccionamiento()


            // animate.css
            const active = $("#appMenu .nav-link.active").parent().index()
            const click  = $(`[href^="#${path}"]`).parent().index()

            if ((active <= 0)
            ||  (click  <= 0)
            ||  (active == click)) {
                $rootScope.slide = "animate__animated animate__faster animate__bounceIn"
            }
            else if (active != click) {
                $rootScope.slide  = "animate__animated animate__faster animate__slideIn"
                $rootScope.slide += ((active > click) ? "Left" : "Right")
            }


            // swipe
            if (path.indexOf("productos") != -1) {
                $rootScope.leftView      = ""
                $rootScope.rightView     = "Ventas"
                $rootScope.leftViewLink  = ""
                $rootScope.rightViewLink = "#/ventas"
            }
            else if (path.indexOf("ventas") != -1) {
                $rootScope.leftView      = "Productos"
                $rootScope.rightView     = "Notificaciones"
                $rootScope.leftViewLink  = "#/productos"
                $rootScope.rightViewLink = "#/notificaciones"
            }
            else {
                $rootScope.leftView      = ""
                $rootScope.rightView     = ""
                $rootScope.leftViewLink  = ""
                $rootScope.rightViewLink = ""
            }

            let offsetX
            let threshold
            let startX = 0
            let startY = 0
            let currentX = 0
            let isDragging = false
            let isScrolling = false
            let moved = false
            let minDrag = 5

            function resetDrag() {
                offsetX = -window.innerWidth
                threshold = window.innerWidth / 4
                $("#appSwipeWrapper").get(0).style.transition = "transform 0s ease"
                $("#appSwipeWrapper").get(0).style.transform = `translateX(${offsetX}px)`
            }
            function startDrag(event) {
                if (isScrolling && isPartiallyVisible($("#appContent").get(0))) {
                    resetDrag()
                }

                isDragging  = true
                moved       = false
                isScrolling = false

                startX = getX(event)
                startY = getY(event)

                $("#appSwipeWrapper").get(0).style.transition = "none"
                document.body.style.userSelect = "none"
            }
            function onDrag(event) {
                if (!isDragging
                ||  $(event.target).parents("table").length
                ||  $(event.target).parents("button").length
                ||  $(event.target).parents("span").length
                ||   (event.target.nodeName == "BUTTON")
                ||   (event.target.nodeName == "SPAN")
                || $(event.target).parents(".plotly-grafica").length
                || $(event.target).hasClass("plotly-grafica")) {
                    return
                }

                let x = getX(event)
                let y = getY(event)

                let deltaX = x - startX
                let deltaY = y - startY
                
                if (isScrolling) {
                    if (isPartiallyVisible($("#appContent").get(0))) {
                        resetDrag()
                    }
                    return
                }

                if (!moved) {
                    if (Math.abs(deltaY) > Math.abs(deltaX)) {
                        isScrolling = true
                        return
                    }
                }

                if (Math.abs(deltaX) > minDrag) {
                    moved = true
                }

                currentX = offsetX + deltaX
                $("#appSwipeWrapper").get(0).style.transform = `translateX(${currentX}px)`
                $("#appSwipeWrapper").get(0).style.cursor = "grabbing"

                event.preventDefault()
            }
            function isVisible(element) {
                const rect = element.getBoundingClientRect()
                return rect.left >= 0 && rect.right <= window.innerWidth
            }
            function isPartiallyVisible(element) {
                const rect = element.getBoundingClientRect()
                return rect.right > 0 && rect.left < window.innerWidth
            }
            function endDrag() {
                if (!isDragging) {
                    return
                }
                $("#appSwipeWrapper").get(0).style.cursor = "grab"
                isDragging = false
                document.body.style.userSelect = ""
                if (isScrolling) {
                    if (isPartiallyVisible($("#appContent").get(0))) {
                        resetDrag()
                    }
                    return
                }

                if (!moved) {
                    $("#appSwipeWrapper").get(0).style.transition = "transform 0.3s ease"
                    $("#appSwipeWrapper").get(0).style.transform = `translateX(${offsetX}px)`
                    return
                }

                let delta = currentX - offsetX
                let finalX = offsetX

                let href, visible

                if (delta > threshold && offsetX < 0) {
                    finalX = offsetX + window.innerWidth
                    $("#appContentLeft").css("visibility", "visible")
                    $("#appContentRight").css("visibility", "hidden")
                    href = $("#appContentLeft").children("div").eq(0).attr("data-href")
                    visible = isPartiallyVisible($("#appContentLeft").get(0))
                } else if (delta < -threshold && offsetX > -2 * window.innerWidth) {
                    finalX = offsetX - window.innerWidth
                    $("#appContentLeft").css("visibility", "hidden")
                    $("#appContentRight").css("visibility", "visible")
                    href = $("#appContentRight").children("div").eq(0).attr("data-href")
                    visible = isPartiallyVisible($("#appContentRight").get(0))
                }

                if (href && visible) {
                    resetDrag()
                    $timeout(function () {
                        window.location = href
                    }, 100)
                } else if (!href) {
                    resetDrag()
                    return
                }

                $("#appSwipeWrapper").get(0).style.transition = "transform 0.3s ease"
                $("#appSwipeWrapper").get(0).style.transform = `translateX(${finalX}px)`
                offsetX = finalX
            }
            function getX(event) {
                return event.touches ? event.touches[0].clientX : event.clientX
            }
            function getY(event) {
                return event.touches ? event.touches[0].clientY : event.clientY
            }
            function completeScreen() {
                $(".div-to-complete-screen").css("height", 0)
                const altoHtml    = document.documentElement.getBoundingClientRect().height
                const altoVisible = document.documentElement.clientHeight
                $(".div-to-complete-screen").css("height", ((altoHtml < altoVisible)
                ? (altoVisible - altoHtml)
                : 0) + (16 * 4))
            }

            $(document).off("mousedown touchstart mousemove touchmove click", "#appSwipeWrapper")

            $(document).on("mousedown",  "#appSwipeWrapper", startDrag)
            $(document).on("touchstart", "#appSwipeWrapper", startDrag)
            $(document).on("mousemove",  "#appSwipeWrapper", onDrag)
            // $(document).on("touchmove",  "#appSwipeWrapper", onDrag)
            document.querySelector("#appSwipeWrapper").addEventListener("touchmove", onDrag, {
                passive: false
            })
            $(document).on("mouseup",    "#appSwipeWrapper", endDrag)
            $(document).on("mouseleave", "#appSwipeWrapper", endDrag)
            $(document).on("touchend",   "#appSwipeWrapper", endDrag)
            $(document).on("click",      "#appSwipeWrapper", function (event) {
                if (moved) {
                    event.stopImmediatePropagation()
                    event.preventDefault()
                    return false
                }
            })
            $(window).on("resize", function (event) {
                resetDrag()
                completeScreen()
            })

            resetDrag()


            // solo hacer una vez cargada la animación
            $timeout(function () {
                // animate.css
                $rootScope.slide = ""


                // swipe
                completeScreen()


                // solo hacer al cargar la página por primera vez
                if (timesChangesSuccessRoute == 0) {
                    timesChangesSuccessRoute++
                    

                    // JQuery Validate
                    $.extend($.validator.messages, {
                        required: "Llena este campo",
                        number: "Solo números",
                        digits: "Solo números enteros",
                        min: $.validator.format("No valores menores a {0}"),
                        max: $.validator.format("No valores mayores a {0}"),
                        minlength: $.validator.format("Mínimo {0} caracteres"),
                        maxlength: $.validator.format("Máximo {0} caracteres"),
                        rangelength: $.validator.format("Solo {0} caracteres"),
                        equalTo: "El texto de este campo no coincide con el anterior",
                        date: "Ingresa fechas validas",
                        email: "Ingresa un correo electrónico valido"
                    })


                    // gets
                    const startTimeRequest = Date.now()
                    $.get("fechaHora", function (fechaHora) {
                        const endTimeRequest = Date.now()
                        const rtt            = endTimeRequest - startTimeRequest
                        const delay          = rtt / 2

                        const lxFechaHoraServidor = DateTime.fromFormat(fechaHora, "yyyy-MM-dd hh:mm:ss")
                        // const fecha = lxFechaHoraServidor.toFormat("dd/MM/yyyy hh:mm:ss")
                        const lxLocal = luxon.DateTime.fromMillis(endTimeRequest - delay)

                        diffMs = lxFechaHoraServidor.toMillis() - lxLocal.toMillis()
                    })

                    $.get("preferencias", {
                        token: localStorage.getItem("fbt")
                    }, function (respuesta) {
                        if (typeof respuesta != "object") {
                            return
                        }

                        console.log("✅ Respuesta recibida:", respuesta)

                        const login      = "1"
                        let preferencias = respuesta

                        localStorage.setItem("login", login)
                        localStorage.setItem("preferencias", JSON.stringify(preferencias))
                        $rootScope.redireccionar(login, preferencias)
                    })


                    // events
                    $(document).on("click", ".toggle-password", function (event) {
                        const prev = $(this).parent().find("input")

                        if (prev.prop("disabled")) {
                            return
                        }

                        prev.focus()

                        if ("selectionStart" in prev.get(0)){
                            $timeout(function () {
                                prev.get(0).selectionStart = prev.val().length
                                prev.get(0).selectionEnd   = prev.val().length
                            }, 0)
                        }

                        if (prev.attr("type") == "password") {
                            $(this).children().first()
                            .removeClass("bi-eye")
                            .addClass("bi-eye-slash")
                            prev.attr({
                                "type": "text",
                                "autocomplete": "off",
                                "data-autocomplete": prev.attr("autocomplete")
                            })
                            return
                        }

                        $(this).children().first()
                        .addClass("bi-eye")
                        .removeClass("bi-eye-slash")
                        prev.attr({
                            "type": "password",
                            "autocomplete": prev.attr("data-autocomplete")
                        })
                    })
                }
            }, 500)

            activeMenuOption(`#${path}`)
        }
    })
}])

app.controller("loginCtrl", function ($scope, $http, $rootScope) {
    $("#frmInicioSesion").submit(function (event) {
        event.preventDefault()

        pop(".div-inicio-sesion", 'ℹ️Iniciando sesi&oacute;n, espere un momento...', "primary")

        $.post("iniciarSesion", $(this).serialize(), function (respuesta) {
            enableAll()

            if (respuesta.length) {
                localStorage.setItem("login", "1")
                localStorage.setItem("preferencias", JSON.stringify(respuesta[0]))
                $("#frmInicioSesion").get(0).reset()
                location.reload()
                return
            }

            pop(".div-inicio-sesion", "Usuario y/o contrase&ntilde;a incorrecto(s)", "danger")
        })

        disableAll()
    })
})
app.controller("productosCtrl", function ($scope, $http, $rootScope) {
    function buscarProductos() {
        $("#tbodyProductos").html(`<tr>
            <th colspan="5" class="text-center">
                <div class="spinner-border" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
            </th>
        </tr>`)
        $.get("productos/buscar", {
            busqueda: ""
        }, function (productos) {
            enableAll()
            $("#tbodyProductos").html("")
            for (let x in productos) {
                const producto = productos[x]

                $("#tbodyProductos").append(`<tr>
                    <td>${producto.Id_Producto}</td>
                    <td>${producto.Nombre_Producto}</td>
                    <td>${producto.Precio}</td>
                    <td>${producto.Existencias}</td>
                    <td>
                        <button class="btn btn-info btn-ingredientes me-1 mb-1 while-waiting" data-id="${producto.Id_Producto}">Ver ingredientes...</button>
                        <button class="btn btn-danger btn-eliminar while-waiting" data-id="${producto.Id_Producto}">Eliminar</button>
                    </td>
                </tr>`)
            }
        })
        disableAll()
    }

    buscarProductos()
    
    let preferencias = $rootScope.preferencias

    Pusher.logToConsole = true

    const pusher = new Pusher("12cb9c6b5319b2989000", {
        cluster: "us2"
    })
    const channel = pusher.subscribe("canalProductos")

    $(document).on("submit", "#frmProducto", function (event) {
        event.preventDefault()

        $.post("producto", {
            id: "",
            nombre: $("#txtNombre").val(),
            precio: $("#txtPrecio").val(),
            existencias: $("#txtExistencias").val(),
        }, function (respuesta) {
            enableAll()
        })
        disableAll()
    })

    $(document).on("click", "#chkActualizarAutoTbodyProductos", function (event) {
        if (this.checked) {
            channel.bind("eventoProductos", function(data) {
                // alert(JSON.stringify(data))
                buscarProductos()
            })
            return
        }

        channel.unbind("eventoProductos")
    })

    $(document).on("click", ".btn-ingredientes", function (event) {
        const id = $(this).data("id")

        $.get(`productos/ingredientes/${id}`, function (html) {
            modal(html, "Ingredientes", [
                {html: "Aceptar", class: "btn btn-secondary", fun: function (event) {
                    closeModal()
                }}
            ])
        })
    })

    $(document).on("click", ".btn-eliminar", function (event) {
        const id = $(this).data("id")

        modal("Eliminar este producto?", 'Confirmaci&oacute;n', [
            {html: "No", class: "btn btn-secondary", dismiss: true},
            {html: "Sí", class: "btn btn-danger while-waiting", defaultButton: true, fun: function () {
                $.post(`producto/eliminar`, {
                    id: id
                }, function (respuesta) {
                    enableAll()
                    closeModal()
                })
                disableAll()
            }}
        ])
    })
})


app.controller("decoracionesCtrl", function ($scope, $http) {
    function buscarDecoraciones() {
        $.get("tbodyDecoraciones", function (trsHTML) {
            $("#tbodyDecoraciones").html(trsHTML)
        })
    }

    buscarDecoraciones()
    
    Pusher.logToConsole = true

    const pusher = new Pusher("12cb9c6b5319b2989000", {
        cluster: "us2"
    })
    const channel = pusher.subscribe("canalDecoraciones")
    channel.bind("eventoDecoraciones", function(data) {
        // alert(JSON.stringify(data))
        buscarDecoraciones()
    })

    $(document).on("submit", "#frmDecoracion", function (event) {
        event.preventDefault()

        $.post("decoracion", {
            id: "",
            nombre: $("#txtNombre").val(),
            precio: $("#txtPrecio").val(),
            existencias: $("#txtExistencias").val(),
        })
    })
})


document.addEventListener("DOMContentLoaded", function (event) {
    activeMenuOption(location.hash)
})
