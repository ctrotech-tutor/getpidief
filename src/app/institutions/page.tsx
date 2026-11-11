"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { MapPin, Users, FileText, Globe, Search, Filter, ArrowRight, Building2, GraduationCap, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import 'leaflet/dist/leaflet.css';

// Dynamic import for Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import("react-leaflet").then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import("react-leaflet").then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import("react-leaflet").then(mod => mod.Popup), { ssr: false })

interface Institution {
  id: string
  name: string
  country: string
  region: string
  lat: number
  lng: number
  docs: number
  students: number
  type: "university" | "polytechnic" | "college"
  established: number
  website?: string
}

const institutions: Institution[] = [
  // Nigeria
  { id: "1", name: "University of Lagos", country: "Nigeria", region: "West Africa", lat: 6.5244, lng: 3.3792, docs: 2341, students: 55000, type: "university", established: 1962 },
  { id: "2", name: "Obafemi Awolowo University", country: "Nigeria", region: "West Africa", lat: 7.5225, lng: 4.5232, docs: 298, students: 35000, type: "university", established: 1961 },
  { id: "3", name: "University of Ibadan", country: "Nigeria", region: "West Africa", lat: 7.4445, lng: 3.8894, docs: 654, students: 35000, type: "university", established: 1948 },
  { id: "4", name: "University of Benin", country: "Nigeria", region: "West Africa", lat: 6.3350, lng: 5.6037, docs: 276, students: 50000, type: "university", established: 1970 },
  { id: "5", name: "Ahmadu Bello University", country: "Nigeria", region: "West Africa", lat: 10.5144, lng: 7.4320, docs: 432, students: 35000, type: "university", established: 1962 },
  
  // South Africa
  { id: "6", name: "University of Cape Town", country: "South Africa", region: "Southern Africa", lat: -33.9399, lng: 18.4332, docs: 1892, students: 29000, type: "university", established: 1829 },
  { id: "7", name: "University of Pretoria", country: "South Africa", region: "Southern Africa", lat: -25.7545, lng: 28.2315, docs: 321, students: 50000, type: "university", established: 1908 },
  { id: "8", name: "Stellenbosch University", country: "South Africa", region: "Southern Africa", lat: -33.9293, lng: 18.8642, docs: 987, students: 32000, type: "university", established: 1918 },
  { id: "9", name: "Rhodes University", country: "South Africa", region: "Southern Africa", lat: -33.3126, lng: 26.5216, docs: 156, students: 8000, type: "university", established: 1904 },
  
  // Ghana
  { id: "10", name: "University of Ghana", country: "Ghana", region: "West Africa", lat: 5.6538, lng: -0.1865, docs: 876, students: 40000, type: "university", established: 1948 },
  { id: "11", name: "KNUST", country: "Ghana", region: "West Africa", lat: 6.6738, lng: -1.5642, docs: 1456, students: 40000, type: "university", established: 1952 },
  
  // Kenya
  { id: "12", name: "University of Nairobi", country: "Kenya", region: "East Africa", lat: -1.2833, lng: 36.8177, docs: 1234, students: 80000, type: "university", established: 1956 },
  
  // Uganda
  { id: "13", name: "Makerere University", country: "Uganda", region: "East Africa", lat: 0.3210, lng: 32.5732, docs: 765, students: 40000, type: "university", established: 1922 },
  
  // Tanzania
  { id: "14", name: "University of Dar es Salaam", country: "Tanzania", region: "East Africa", lat: -6.7833, lng: 39.2083, docs: 232, students: 25000, type: "university", established: 1961 },
  
  // Egypt
  { id: "15", name: "Cairo University", country: "Egypt", region: "North Africa", lat: 30.0131, lng: 31.2089, docs: 254, students: 200000, type: "university", established: 1908 },
  
  // UK/Europe
  { id: "16", name: "University of Edinburgh", country: "United Kingdom", region: "Europe", lat: 55.9444, lng: -3.1883, docs: 543, students: 45000, type: "university", established: 1582 },
  { id: "17", name: "Imperial College London", country: "United Kingdom", region: "Europe", lat: 51.4988, lng: -0.1749, docs: 432, students: 20000, type: "university", established: 1907 },
  { id: "18", name: "University of Warwick", country: "United Kingdom", region: "Europe", lat: 52.3820, lng: -1.5606, docs: 387, students: 28000, type: "university", established: 1965 },
  { id: "19", name: "University of Manchester", country: "United Kingdom", region: "Europe", lat: 53.4631, lng: -2.2008, docs: 298, students: 40000, type: "university", established: 1851 },
]

const additionalInstitutions = [
  "University of Zimbabwe", "University of Botswana", "University of Namibia", 
  "University of Malawi", "University of Rwanda", "University of Zambia",
  "University of Mozambique", "University of Angola", "University of Ethiopia",
  "University of Sudan", "University of Cameroon", "University of Senegal",
  "University of Ivory Coast", "University of Burkina Faso", "University of Tunisia",
  "University of Morocco", "University of Algeria", "University of Libya"
]

export default function InstitutionsPage() {
  const [selectedRegion, setSelectedRegion] = React.useState<string>("all")
  const [searchTerm, setSearchTerm] = React.useState("")
  const [mapType, setMapType] = React.useState<"2d" | "3d">("2d")
  const [mounted, setMounted] = React.useState(false)

  const randomPositions = React.useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      left: `${((i * 137) % 100)}%`,
      top: `${((i * 89) % 100)}%`,
      animationDelay: `${(i * 0.15) % 3}s`
    }))
  }, [])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const filteredInstitutions = React.useMemo(() => {
    return institutions.filter(inst => {
      const matchesRegion = selectedRegion === "all" || inst.region === selectedRegion
      const matchesSearch = inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           inst.country.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesRegion && matchesSearch
    })
  }, [selectedRegion, searchTerm])

  const regions = React.useMemo(() => {
    const uniqueRegions = Array.from(new Set(institutions.map(inst => inst.region)))
    return ["all", ...uniqueRegions]
  }, [])

  const stats = React.useMemo(() => {
    return {
      totalInstitutions: institutions.length,
      totalDocuments: institutions.reduce((sum, inst) => sum + inst.docs, 0),
      totalStudents: institutions.reduce((sum, inst) => sum + inst.students, 0),
      countries: Array.from(new Set(institutions.map(inst => inst.country))).length
    }
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-24">
          <div className="text-center">
            <h1 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
              Institutions Map
            </h1>
            <div className="h-96 md:h-[500px] glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-3xl flex items-center justify-center">
              <div className="text-muted-foreground">Loading interactive map...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/40 bg-primary/10 text-primary text-sm font-medium mb-8">
              <Globe className="w-4 h-4" />
              Global Academic Network
            </div>
            <h1 className="font-heading font-black text-foreground tracking-tight mb-6" style={{ fontSize: "clamp(48px, 6vw, 72px)" }}>
              Institutions Powering Academic Excellence
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Join a growing network of prestigious universities sharing knowledge across Africa and beyond. 
              From historic institutions to modern research centers, discover academic excellence in every corner of the globe.
            </p>
            <div className="flex flex-wrap justify-center gap-8 mb-12">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{stats.countries}+</div>
                  <div className="text-sm text-muted-foreground">Countries</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{stats.totalInstitutions}+</div>
                  <div className="text-sm text-muted-foreground">Institutions</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-foreground">{(stats.totalStudents / 1000).toFixed(0)}K+</div>
                  <div className="text-sm text-muted-foreground">Students</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
              Interactive Global Map
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Explore our network of partner institutions. Click on any marker to discover detailed information about each university.
            </p>
          </div>

          {/* Controls */}
          <div className="mb-8 flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search institutions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64"
                />
              </div>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {regions.map(region => (
                  <option key={region} value={region}>
                    {region === "all" ? "All Regions" : region}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant={mapType === "2d" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapType("2d")}
              >
                2D Map
              </Button>
              <Button
                variant={mapType === "3d" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapType("3d")}
              >
                3D View
              </Button>
            </div>
          </div>

          {/* Map Container */}
          <div className="relative mb-16">
            <div className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-3xl overflow-hidden">
              {mapType === "2d" ? (
                <div className="h-96 md:h-[500px]">
                  <MapContainer
                    center={[0, 20]}
                    zoom={3}
                    className="h-full w-full"
                    style={{ zIndex: 1 }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {filteredInstitutions.map((institution) => (
                      <Marker key={institution.id} position={[institution.lat, institution.lng]}>
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <h3 className="font-semibold text-foreground mb-1">{institution.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{institution.country}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Documents:</span>
                                <span className="text-foreground font-medium">{institution.docs.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Students:</span>
                                <span className="text-foreground font-medium">{institution.students.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Established:</span>
                                <span className="text-foreground font-medium">{institution.established}</span>
                              </div>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              ) : (
                <div className="h-96 md:h-[500px] relative bg-gradient-to-b from-blue-900/20 to-blue-800/10">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Globe className="w-16 h-16 text-primary/50 mx-auto mb-4" />
                      <h3 className="text-foreground font-semibold mb-2">3D View Coming Soon</h3>
                      <p className="text-muted-foreground text-sm">Interactive 3D globe with institution clusters</p>
                    </div>
                  </div>
                  {/* Placeholder for 3D visualization */}
                  <div className="absolute inset-0 overflow-hidden">
                    {randomPositions.map((position, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-primary/30 rounded-full animate-pulse"
                        style={{
                          left: position.left,
                          top: position.top,
                          animationDelay: position.animationDelay
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Regional Breakdown */}
      <section className="py-24 px-4 bg-surface/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
              Regional Presence
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our network spans across multiple regions, connecting academic communities worldwide.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {regions.slice(1).map((region) => {
              const regionInstitutions = institutions.filter(inst => inst.region === region)
              const regionDocs = regionInstitutions.reduce((sum, inst) => sum + inst.docs, 0)
              const regionStudents = regionInstitutions.reduce((sum, inst) => sum + inst.students, 0)
              
              return (
                <div key={region} className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-8">
                  <h3 className="font-bold text-foreground text-xl mb-4">{region}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Institutions</span>
                      <span className="font-semibold text-foreground">{regionInstitutions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Documents</span>
                      <span className="font-semibold text-foreground">{regionDocs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Students</span>
                      <span className="font-semibold text-foreground">{(regionStudents / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Institution Directory */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
              Institution Directory
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Browse our complete directory of partner institutions and their academic contributions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInstitutions.map((institution) => (
              <div
                key={institution.id}
                className="glass-card border border-border/50 bg-surface/60 backdrop-blur-20 rounded-xl p-6 hover:border-primary/50 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {institution.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{institution.country} • {institution.region}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{institution.type}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{institution.docs.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{(institution.students / 1000).toFixed(0)}K</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Established {institution.established}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="text-muted-foreground mb-4">
              + {additionalInstitutions.length} more universities joining soon
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <Award className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="font-heading font-black text-foreground tracking-tight mb-4" style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>
              Join Our Academic Network
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Is your institution ready to join the future of academic collaboration? 
              Partner with getpidief to connect with thousands of scholars and share knowledge globally.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="group">
                Partner With Us
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
